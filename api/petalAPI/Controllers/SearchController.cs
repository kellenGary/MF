using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using PetalAPI.Data;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<SearchController> _logger;

    public SearchController(AppDbContext context, ILogger<SearchController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Searches for users and tracks matching the query.
    /// </summary>
    /// <param name="q">The search query string.</param>
    /// <param name="limit">Maximum results per category (default 10).</param>
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int limit = 10)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return Ok(new { users = new List<object>(), tracks = new List<object>(), albums = new List<object>(), artists = new List<object>(), playlists = new List<object>() });
        }

        var query = q.ToLower().Trim();

        // Search users by display name or handle
        var users = await _context.Users
            .Where(u => (u.DisplayName != null && u.DisplayName.ToLower().Contains(query)) || 
                        (u.Handle != null && u.Handle.ToLower().Contains(query)))
            .Take(limit)
            .Select(u => new
            {
                id = u.Id,
                displayName = u.DisplayName,
                handle = u.Handle,
                profileImageUrl = u.ProfileImageUrl
            })
            .ToListAsync();

        // Search tracks by name, include album and artist info
        var tracks = await _context.Tracks
            .Include(t => t.Album)
            .Include(t => t.TrackArtists)
                .ThenInclude(ta => ta.Artist)
            .Where(t => t.Name.ToLower().Contains(query))
            .Take(limit)
            .Select(t => new
            {
                id = t.Id,
                spotifyId = t.SpotifyId,
                name = t.Name,
                durationMs = t.DurationMs,
                albumName = t.Album != null ? t.Album.Name : null,
                albumImageUrl = t.Album != null ? t.Album.ImageUrl : null,
                artistName = t.TrackArtists.FirstOrDefault() != null 
                    ? t.TrackArtists.First().Artist.Name 
                    : null
            })
            .ToListAsync();

        // Search albums by name
        var albums = await _context.Albums
            .Where(a => a.Name.ToLower().Contains(query))
            .Take(limit)
            .Select(a => new
            {
                id = a.Id,
                spotifyId = a.SpotifyId,
                name = a.Name,
                imageUrl = a.ImageUrl,
                albumType = a.AlbumType,
                totalTracks = a.TotalTracks
            })
            .ToListAsync();

        // Search artists by name
        var artists = await _context.Artists
            .Where(a => a.Name.ToLower().Contains(query))
            .Take(limit)
            .Select(a => new
            {
                id = a.Id,
                spotifyId = a.SpotifyId,
                name = a.Name,
                imageUrl = a.ImageUrl
            })
            .ToListAsync();

        // Search playlists by name (public only)
        var playlists = await _context.Playlists
            .Where(p => p.Public && p.Name.ToLower().Contains(query))
            .Take(limit)
            .Select(p => new
            {
                id = p.Id,
                spotifyId = p.SpotifyId,
                name = p.Name,
                imageUrl = p.ImageUrl,
                trackCount = p.TrackCount
            })
            .ToListAsync();

        return Ok(new { users, tracks, albums, artists, playlists });
    }
}
