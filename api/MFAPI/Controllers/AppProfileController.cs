using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using MFAPI.Data;

namespace MFAPI.Controllers;

[ApiController]
[Route("api/profile/app")]
[Authorize]
public class AppProfileController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AppProfileController> _logger;

    public AppProfileController(AppDbContext context, ILogger<AppProfileController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAppProfile()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return Ok(new {
            id = user.Id,
            spotifyId = user.SpotifyId,
            displayName = user.DisplayName,
            handle = user.Handle,
            bio = user.Bio,
            email = user.Email,
            profileImageUrl = user.ProfileImageUrl,
            hasCompletedProfile = user.HasCompletedProfile
        });
    }

    public class UpdateAppProfileDto
    {
        public string? DisplayName { get; set; }
        public string? Handle { get; set; }
        public string? Bio { get; set; }
    }

    [HttpPut]
    public async Task<IActionResult> UpdateAppProfile([FromBody] UpdateAppProfileDto dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        if (dto.DisplayName != null) user.DisplayName = dto.DisplayName;
        if (dto.Handle != null) user.Handle = dto.Handle;
        if (dto.Bio != null) user.Bio = dto.Bio;

        user.HasCompletedProfile = true;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new {
            id = user.Id,
            spotifyId = user.SpotifyId,
            displayName = user.DisplayName,
            handle = user.Handle,
            bio = user.Bio,
            email = user.Email,
            profileImageUrl = user.ProfileImageUrl,
            hasCompletedProfile = user.HasCompletedProfile
        });
    }
}
