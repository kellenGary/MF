using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using MFAPI.Data;
using MFAPI.Models.DTOs;

namespace MFAPI.Controllers;

[Route("api/[controller]")]
[Authorize]
public class TracksController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<TracksController> _logger;

    public TracksController(AppDbContext context, ILogger<TracksController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Gets a single track by native Track Id (not Spotify id) using the TrackDetailsWithArtists view
    /// </summary>
    [HttpGet("{trackId}")]
    public async Task<IActionResult> GetTrackById(int trackId)
    {
        try
        {
            var rows = await _context.Database
                .SqlQueryRaw<TrackDetailsViewRow>(@"
                    SELECT TrackId, TrackSpotifyId, TrackName, DurationMs, ""Explicit"", Popularity,
                           AlbumId, AlbumSpotifyId, AlbumName, AlbumImageUrl, AlbumReleaseDate,
                           ArtistId, ArtistSpotifyId, ArtistName, ArtistOrder
                    FROM TrackDetailsWithArtists
                    WHERE TrackId = {0}
                    ORDER BY ArtistOrder", trackId)
                .ToListAsync();

            if (rows == null || rows.Count == 0)
            {
                return NotFound(new { error = "Track not found" });
            }

            var first = rows.First();

            var track = new
            {
                id = first.TrackId,
                spotify_id = first.TrackSpotifyId,
                name = first.TrackName,
                duration_ms = first.DurationMs,
                @explicit = first.Explicit,
                popularity = first.Popularity,
                album = first.AlbumId == null ? null : new
                {
                    id = first.AlbumId,
                    spotify_id = first.AlbumSpotifyId,
                    name = first.AlbumName,
                    image_url = first.AlbumImageUrl,
                    release_date = first.AlbumReleaseDate
                },
                artists = rows
                    .Where(r => r.ArtistId != null)
                    .OrderBy(r => r.ArtistOrder)
                    .Select(r => new { id = r.ArtistId, spotify_id = r.ArtistSpotifyId, name = r.ArtistName, order = r.ArtistOrder })
                    .ToList()
            };

            return Ok(new { track });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching track details for {TrackId}", trackId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
