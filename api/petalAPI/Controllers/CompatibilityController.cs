using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using PetalAPI.Data;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class CompatibilityController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<CompatibilityController> _logger;

    public CompatibilityController(AppDbContext context, ILogger<CompatibilityController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Returns a music compatibility score between the authenticated user and the target user.
    /// </summary>
    /// <param name="userId">The target user's ID.</param>
    [HttpGet("{userId}/compatibility")]
    public async Task<IActionResult> GetCompatibility(int userId)
    {
        try
        {
            var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (currentUserIdClaim == null || !int.TryParse(currentUserIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            if (currentUserId == userId)
            {
                return BadRequest(new { error = "Cannot compute compatibility with yourself" });
            }

            // Verify target user exists
            var targetUserExists = await _context.Users.AnyAsync(u => u.Id == userId);
            if (!targetUserExists)
            {
                return NotFound(new { error = "User not found" });
            }

            // Compute all factors in parallel
            var sharedTracksTask = ComputeSharedTracks(currentUserId, userId);
            var likedAlbumsTask = ComputeSharedLikedAlbums(currentUserId, userId);
            var followedArtistsTask = ComputeSharedFollowedArtists(currentUserId, userId);
            var genreOverlapTask = ComputeGenreOverlap(currentUserId, userId);

            await Task.WhenAll(sharedTracksTask, likedAlbumsTask, followedArtistsTask, genreOverlapTask);

            var sharedTracks = await sharedTracksTask;
            var likedAlbums = await likedAlbumsTask;
            var followedArtists = await followedArtistsTask;
            var genreOverlap = await genreOverlapTask;

            // Weighted scoring with redistribution for empty factors
            var factors = new List<(string Name, double Score, double DefaultWeight, int Count, string Label)>
            {
                ("Shared Tracks", sharedTracks.Score, 0.30, sharedTracks.Count, $"{sharedTracks.Count} tracks in common"),
                ("Liked Albums", likedAlbums.Score, 0.20, likedAlbums.Count, $"{likedAlbums.Count} albums in common"),
                ("Followed Artists", followedArtists.Score, 0.25, followedArtists.Count, $"{followedArtists.Count} artists in common"),
                ("Genre Overlap", genreOverlap.Score, 0.25, genreOverlap.Count, $"{genreOverlap.Count} genres in common"),
            };

            // Check if we have any data at all
            bool hasAnyData = sharedTracks.HasData || likedAlbums.HasData || followedArtists.HasData || genreOverlap.HasData;

            if (!hasAnyData)
            {
                return Ok(new
                {
                    score = 0,
                    insufficientData = true,
                    breakdown = Array.Empty<object>()
                });
            }

            // Redistribute weights from factors with no data
            double totalActiveWeight = factors.Where(f => FactorHasData(f.Name, sharedTracks, likedAlbums, followedArtists, genreOverlap)).Sum(f => f.DefaultWeight);
            double overallScore = 0;

            var breakdown = new List<object>();
            foreach (var factor in factors)
            {
                bool hasData = FactorHasData(factor.Name, sharedTracks, likedAlbums, followedArtists, genreOverlap);
                double effectiveWeight = hasData && totalActiveWeight > 0 ? factor.DefaultWeight / totalActiveWeight : 0;
                overallScore += factor.Score * effectiveWeight;

                breakdown.Add(new
                {
                    name = factor.Name,
                    score = Math.Round(factor.Score, 1),
                    count = factor.Count,
                    label = factor.Label,
                    hasData = hasData
                });
            }

            return Ok(new
            {
                score = Math.Round(overallScore, 1),
                insufficientData = false,
                breakdown
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error computing compatibility for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    // === Factor Computation Methods ===

    private record FactorResult(double Score, int Count, bool HasData);

    private async Task<FactorResult> ComputeSharedTracks(int userA, int userB)
    {
        // Get distinct track IDs each user has listened to (only meaningful plays)
        var userATrackIds = await _context.ListeningHistory
            .Where(lh => lh.UserId == userA && lh.MsPlayed >= 15000)
            .Select(lh => lh.TrackId)
            .Distinct()
            .ToListAsync();

        var userBTrackIds = await _context.ListeningHistory
            .Where(lh => lh.UserId == userB && lh.MsPlayed >= 15000)
            .Select(lh => lh.TrackId)
            .Distinct()
            .ToListAsync();

        if (userATrackIds.Count == 0 && userBTrackIds.Count == 0)
            return new FactorResult(0, 0, false);

        var userBSet = userBTrackIds.ToHashSet();
        int sharedCount = userATrackIds.Count(id => userBSet.Contains(id));
        int unionCount = userATrackIds.Union(userBTrackIds).Count();

        double score = unionCount > 0 ? (double)sharedCount / unionCount * 100 : 0;
        return new FactorResult(score, sharedCount, true);
    }

    private async Task<FactorResult> ComputeSharedLikedAlbums(int userA, int userB)
    {
        var userAAlbumIds = await _context.UserLikedAlbums
            .Where(ula => ula.UserId == userA)
            .Select(ula => ula.AlbumId)
            .ToListAsync();

        var userBAlbumIds = await _context.UserLikedAlbums
            .Where(ula => ula.UserId == userB)
            .Select(ula => ula.AlbumId)
            .ToListAsync();

        if (userAAlbumIds.Count == 0 && userBAlbumIds.Count == 0)
            return new FactorResult(0, 0, false);

        var userBSet = userBAlbumIds.ToHashSet();
        int sharedCount = userAAlbumIds.Count(id => userBSet.Contains(id));
        int unionCount = userAAlbumIds.Union(userBAlbumIds).Count();

        double score = unionCount > 0 ? (double)sharedCount / unionCount * 100 : 0;
        return new FactorResult(score, sharedCount, true);
    }

    private async Task<FactorResult> ComputeSharedFollowedArtists(int userA, int userB)
    {
        var userAArtistIds = await _context.UserFollowedArtists
            .Where(ufa => ufa.UserId == userA)
            .Select(ufa => ufa.ArtistId)
            .ToListAsync();

        var userBArtistIds = await _context.UserFollowedArtists
            .Where(ufa => ufa.UserId == userB)
            .Select(ufa => ufa.ArtistId)
            .ToListAsync();

        if (userAArtistIds.Count == 0 && userBArtistIds.Count == 0)
            return new FactorResult(0, 0, false);

        var userBSet = userBArtistIds.ToHashSet();
        int sharedCount = userAArtistIds.Count(id => userBSet.Contains(id));
        int unionCount = userAArtistIds.Union(userBArtistIds).Count();

        double score = unionCount > 0 ? (double)sharedCount / unionCount * 100 : 0;
        return new FactorResult(score, sharedCount, true);
    }

    private async Task<FactorResult> ComputeGenreOverlap(int userA, int userB)
    {
        // Get genres from artists each user has listened to (top artists by play count)
        var userAGenres = await GetUserGenres(userA);
        var userBGenres = await GetUserGenres(userB);

        if (userAGenres.Count == 0 && userBGenres.Count == 0)
            return new FactorResult(0, 0, false);

        var intersection = userAGenres.Intersect(userBGenres, StringComparer.OrdinalIgnoreCase).ToList();
        var union = userAGenres.Union(userBGenres, StringComparer.OrdinalIgnoreCase).ToList();

        double score = union.Count > 0 ? (double)intersection.Count / union.Count * 100 : 0;
        return new FactorResult(score, intersection.Count, true);
    }

    private async Task<HashSet<string>> GetUserGenres(int userId)
    {
        // Get the top 50 artists by listen count for this user
        var topArtistIds = await _context.ListeningHistory
            .Where(lh => lh.UserId == userId && lh.MsPlayed >= 15000)
            .Join(_context.TrackArtists, lh => lh.TrackId, ta => ta.TrackId, (lh, ta) => ta.ArtistId)
            .GroupBy(artistId => artistId)
            .OrderByDescending(g => g.Count())
            .Take(50)
            .Select(g => g.Key)
            .ToListAsync();

        var genresJsonList = await _context.Artists
            .Where(a => topArtistIds.Contains(a.Id) && a.GenresJson != null)
            .Select(a => a.GenresJson!)
            .ToListAsync();

        var genres = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var json in genresJsonList)
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(json);
                if (parsed != null)
                {
                    foreach (var g in parsed)
                        genres.Add(g);
                }
            }
            catch
            {
                // Skip malformed genre JSON
            }
        }
        return genres;
    }

    private bool FactorHasData(string factorName, FactorResult sharedTracks, FactorResult likedAlbums, FactorResult followedArtists, FactorResult genreOverlap)
    {
        return factorName switch
        {
            "Shared Tracks" => sharedTracks.HasData,
            "Liked Albums" => likedAlbums.HasData,
            "Followed Artists" => followedArtists.HasData,
            "Genre Overlap" => genreOverlap.HasData,
            _ => false
        };
    }
}
