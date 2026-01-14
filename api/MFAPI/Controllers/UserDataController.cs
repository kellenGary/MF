using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MFAPI.Data;
using MFAPI.Models;
using MFAPI.Models.DTOs;

namespace MFAPI.Controllers;
[Route("api/[controller]")]
[Authorize]
public class UserDataController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<UserDataController> _logger;

    public UserDataController(AppDbContext context, ILogger<UserDataController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            return null;
        }
        return userId;
    }

    /// <summary>
    /// Gets user's playlists from the database (synced from Spotify)
    /// </summary>
    [HttpGet("playlists")]
    public async Task<IActionResult> GetPlaylists()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }
        return await GetPlaylistsForUser(userId.Value);
    }

    /// <summary>
    /// Gets another user's playlists from the database
    /// </summary>
    [HttpGet("playlists/{targetUserId}")]
    public async Task<IActionResult> GetPlaylistsByUserId(int targetUserId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Check if target user exists
        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return await GetPlaylistsForUser(targetUserId);
    }

    private async Task<IActionResult> GetPlaylistsForUser(int userId)
    {
        try
        {
            var playlists = await _context.UserPlaylists
                .Where(up => up.UserId == userId)
                .Include(up => up.Playlist)
                .Select(up => new
                {
                    id = up.Playlist.SpotifyId,
                    name = up.Playlist.Name,
                    images = new[] { new { url = up.Playlist.ImageUrl } },
                    tracks = new { total = up.Playlist.TrackCount ?? 0 },
                    owner = new
                    {
                        id = up.Playlist.OwnerSpotifyId != null
                            ? up.Playlist.OwnerSpotifyId
                            : (up.Playlist.OwnerUserId.HasValue ? up.Playlist.OwnerUserId.Value.ToString() : null)
                    }
                })
                .ToListAsync();

            return Ok(new { items = playlists });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user playlists for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets user's liked tracks from the database (synced from Spotify)
    /// Uses UserLikedTracksEnriched view for efficient querying
    /// </summary>
    [HttpGet("liked-tracks")]
    public async Task<IActionResult> GetLikedTracks(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }
        return await GetLikedTracksForUser(userId.Value, limit, offset);
    }

    /// <summary>
    /// Gets another user's liked tracks from the database
    /// </summary>
    [HttpGet("liked-tracks/{targetUserId}")]
    public async Task<IActionResult> GetLikedTracksByUserId(
        int targetUserId,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Check if target user exists
        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return await GetLikedTracksForUser(targetUserId, limit, offset);
    }

    private async Task<IActionResult> GetLikedTracksForUser(int userId, int limit, int offset)
    {
        try
        {
            if (limit < 1 || limit > 1000) limit = 50;
            if (offset < 0) offset = 0;

            // Query the enriched view
            var rawResults = await _context.Database
                .SqlQueryRaw<LikedTrackViewRow>(@"
                    SELECT 
                        UserId, LikedAt, TrackId, TrackSpotifyId, TrackName, 
                        DurationMs, ""Explicit"", Popularity, Isrc,
                        AlbumId, AlbumSpotifyId, AlbumName, AlbumImageUrl, AlbumReleaseDate, AlbumType,
                        ArtistId, ArtistSpotifyId, ArtistName, ArtistOrder
                    FROM UserLikedTracksEnriched 
                    WHERE UserId = {0}
                    ORDER BY LikedAt DESC, TrackId, ArtistOrder", userId)
                .ToListAsync();

            // Group by track and aggregate artists
            var groupedTracks = rawResults
                .GroupBy(r => new { r.TrackSpotifyId, r.LikedAt })
                .Skip(offset)
                .Take(limit)
                .Select(g => new
                {
                    likedAt = g.First().LikedAt,
                    track = new
                    {
                        id = g.First().TrackSpotifyId,
                        name = g.First().TrackName,
                        durationMs = g.First().DurationMs,
                        @explicit = g.First().Explicit,
                        popularity = g.First().Popularity,
                        isrc = g.First().Isrc,
                        artists = g.Where(x => x.ArtistSpotifyId != null)
                            .OrderBy(x => x.ArtistOrder)
                            .Select(x => new { id = x.ArtistSpotifyId, name = x.ArtistName })
                            .Distinct()
                            .ToList(),
                        album = g.First().AlbumSpotifyId == null ? null : new
                        {
                            id = g.First().AlbumSpotifyId,
                            name = g.First().AlbumName,
                            imageUrl = g.First().AlbumImageUrl,
                            releaseDate = g.First().AlbumReleaseDate,
                            albumType = g.First().AlbumType
                        }
                    }
                })
                .ToList();

            var total = rawResults
                .Select(r => r.TrackSpotifyId)
                .Distinct()
                .Count();

            return Ok(new
            {
                items = groupedTracks,
                total,
                limit,
                offset
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching liked tracks for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets user's recently played tracks from database
    /// </summary>
    [HttpGet("recently-played")]
    public async Task<IActionResult> GetRecentlyPlayed(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }
        return await GetRecentlyPlayedForUser(userId.Value, limit, offset);
    }

    /// <summary>
    /// Gets another user's recently played tracks from database
    /// </summary>
    [HttpGet("recently-played/{targetUserId}")]
    public async Task<IActionResult> GetRecentlyPlayedByUserId(
        int targetUserId,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Check if target user exists
        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return await GetRecentlyPlayedForUser(targetUserId, limit, offset);
    }

    private async Task<IActionResult> GetRecentlyPlayedForUser(int userId, int limit, int offset)
    {
        try
        {
            if (limit < 1 || limit > 1000) limit = 50;
            if (offset < 0) offset = 0;

            // Get all listening history with tracks, then group in memory
            var allHistory = await _context.ListeningHistory
                .Where(lh => lh.UserId == userId)
                .Include(lh => lh.Track)
                    .ThenInclude(t => t.Album)
                .Include(lh => lh.Track)
                    .ThenInclude(t => t.TrackArtists)
                    .ThenInclude(ta => ta.Artist)
                .OrderByDescending(lh => lh.PlayedAt)
                .ToListAsync();

            // Group by track and get the most recent play for each unique track
            var recentlyPlayed = allHistory
                .GroupBy(lh => lh.TrackId)
                .Select(g => g.First()) // First item is already the most recent due to OrderBy
                .Skip(offset)
                .Take(limit)
                .Select(lh => new
                {
                    track = new
                    {
                        id = lh.Track.SpotifyId,
                        name = lh.Track.Name,
                        duration_ms = lh.Track.DurationMs,
                        @explicit = lh.Track.Explicit,
                        artists = lh.Track.TrackArtists.Select(ta => new { id = ta.Artist.SpotifyId, name = ta.Artist.Name }),
                        album = lh.Track.Album == null ? null : new
                        {
                            id = lh.Track.Album.SpotifyId,
                            name = lh.Track.Album.Name,
                            images = new[] { new { url = lh.Track.Album.ImageUrl } }
                        }
                    },
                    played_at = lh.PlayedAt
                })
                .ToList();

            var total = allHistory
                .GroupBy(lh => lh.TrackId)
                .Count();

            return Ok(new
            {
                items = recentlyPlayed,
                total,
                limit,
                offset
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching recently played for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets user's liked albums from the database (synced from Spotify)
    /// </summary>
    [HttpGet("liked-albums")]
    public async Task<IActionResult> GetLikedAlbums(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }
        return await GetLikedAlbumsForUser(userId.Value, limit, offset);
    }

    /// <summary>
    /// Gets another user's liked albums from the database
    /// </summary>
    [HttpGet("liked-albums/{targetUserId}")]
    public async Task<IActionResult> GetLikedAlbumsByUserId(
        int targetUserId,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return await GetLikedAlbumsForUser(targetUserId, limit, offset);
    }

    private async Task<IActionResult> GetLikedAlbumsForUser(int userId, int limit, int offset)
    {
        try
        {
            if (limit < 1 || limit > 1000) limit = 50;
            if (offset < 0) offset = 0;

            var likedAlbums = await _context.UserLikedAlbums
                .Where(ula => ula.UserId == userId)
                .Include(ula => ula.Album)
                .OrderByDescending(ula => ula.LikedAt)
                .Skip(offset)
                .Take(limit)
                .Select(ula => new
                {
                    likedAt = ula.LikedAt,
                    album = new
                    {
                        id = ula.Album.SpotifyId,
                        name = ula.Album.Name,
                        imageUrl = ula.Album.ImageUrl,
                        releaseDate = ula.Album.ReleaseDate,
                        albumType = ula.Album.AlbumType,
                        totalTracks = ula.Album.TotalTracks
                    }
                })
                .ToListAsync();

            var total = await _context.UserLikedAlbums
                .Where(ula => ula.UserId == userId)
                .CountAsync();

            return Ok(new
            {
                items = likedAlbums,
                total,
                limit,
                offset
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching liked albums for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets user's followed artists from the database (synced from Spotify)
    /// </summary>
    [HttpGet("followed-artists")]
    public async Task<IActionResult> GetFollowedArtists(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }
        return await GetFollowedArtistsForUser(userId.Value, limit, offset);
    }

    /// <summary>
    /// Gets another user's followed artists from the database
    /// </summary>
    [HttpGet("followed-artists/{targetUserId}")]
    public async Task<IActionResult> GetFollowedArtistsByUserId(
        int targetUserId,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return await GetFollowedArtistsForUser(targetUserId, limit, offset);
    }

    private async Task<IActionResult> GetFollowedArtistsForUser(int userId, int limit, int offset)
    {
        try
        {
            if (limit < 1 || limit > 1000) limit = 50;
            if (offset < 0) offset = 0;

            var followedArtists = await _context.UserFollowedArtists
                .Where(ufa => ufa.UserId == userId)
                .Include(ufa => ufa.Artist)
                .OrderByDescending(ufa => ufa.FollowedAt)
                .Skip(offset)
                .Take(limit)
                .Select(ufa => new
                {
                    followedAt = ufa.FollowedAt,
                    artist = new
                    {
                        id = ufa.Artist.SpotifyId,
                        name = ufa.Artist.Name,
                        imageUrl = ufa.Artist.ImageUrl,
                        popularity = ufa.Artist.Popularity
                    }
                })
                .ToListAsync();

            var total = await _context.UserFollowedArtists
                .Where(ufa => ufa.UserId == userId)
                .CountAsync();

            return Ok(new
            {
                items = followedArtists,
                total,
                limit,
                offset
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching followed artists for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
