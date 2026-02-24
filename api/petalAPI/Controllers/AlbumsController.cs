using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;

namespace PetalAPI.Controllers;

[Route("api/[controller]")]
[Authorize]
public class AlbumsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AlbumsController> _logger;

    public AlbumsController(AppDbContext context, ILogger<AlbumsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Gets users who have saved a specific album, prioritizing users the current user follows.
    /// </summary>
    /// <param name="albumId">The internal (database) ID of the album.</param>
    /// <param name="limit">The maximum number of items to return.</param>
    [HttpGet("{albumId}/fans")]
    public async Task<IActionResult> GetAlbumFans(int albumId, [FromQuery] int limit = 10)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var fans = await _context.UserLikedAlbums
                .Where(ula => ula.AlbumId == albumId && ula.UserId != currentUserId)
                .Join(_context.Users,
                    ula => ula.UserId,
                    u => u.Id,
                    (ula, u) => new { ula, u })
                .GroupJoin(_context.Follows.Where(f => f.FollowerUserId == currentUserId),
                    x => x.u.Id,
                    f => f.FolloweeUserId,
                    (x, follows) => new { x.ula, x.u, IsFollowing = follows.Any() })
                .OrderByDescending(x => x.IsFollowing)
                .ThenByDescending(x => x.ula.LikedAt)
                .Take(limit)
                .Select(x => new
                {
                    id = x.u.Id,
                    displayName = x.u.DisplayName,
                    handle = x.u.Handle,
                    profileImageUrl = x.u.ProfileImageUrl,
                    isFollowing = x.IsFollowing,
                    savedAt = x.ula.LikedAt
                })
                .ToListAsync();

            return Ok(new { fans, totalCount = fans.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching fans for album {AlbumId}", albumId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets users who have saved a specific album by Spotify ID.
    /// </summary>
    /// <param name="spotifyAlbumId">The Spotify ID of the album.</param>
    /// <param name="limit">The maximum number of items to return.</param>
    [HttpGet("spotify/{spotifyAlbumId}/fans")]
    public async Task<IActionResult> GetAlbumFansBySpotifyId(string spotifyAlbumId, [FromQuery] int limit = 10)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            // Find the album by Spotify ID first
            var album = await _context.Albums
                .FirstOrDefaultAsync(a => a.SpotifyId == spotifyAlbumId);

            if (album == null)
            {
                return Ok(new { fans = new object[0], totalCount = 0 });
            }

            var fans = await _context.UserLikedAlbums
                .Where(ula => ula.AlbumId == album.Id && ula.UserId != currentUserId)
                .Join(_context.Users,
                    ula => ula.UserId,
                    u => u.Id,
                    (ula, u) => new { ula, u })
                .GroupJoin(_context.Follows.Where(f => f.FollowerUserId == currentUserId),
                    x => x.u.Id,
                    f => f.FolloweeUserId,
                    (x, follows) => new { x.ula, x.u, IsFollowing = follows.Any() })
                .OrderByDescending(x => x.IsFollowing)
                .ThenByDescending(x => x.ula.LikedAt)
                .Take(limit)
                .Select(x => new
                {
                    id = x.u.Id,
                    displayName = x.u.DisplayName,
                    handle = x.u.Handle,
                    profileImageUrl = x.u.ProfileImageUrl,
                    isFollowing = x.IsFollowing,
                    savedAt = x.ula.LikedAt
                })
                .ToListAsync();

            return Ok(new { fans, totalCount = fans.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching fans for album {SpotifyAlbumId}", spotifyAlbumId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
