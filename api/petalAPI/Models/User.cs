using System.ComponentModel.DataAnnotations;

namespace PetalAPI.Models;

public class User
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public string SpotifyId { get; set; } = string.Empty;
    
    public string? DisplayName { get; set; }
    
    // Username/handle (e.g., example)
    public string? Handle { get; set; }
    
    // User bio text
    public string? Bio { get; set; }
    
    public string? Email { get; set; }
    
    public string? ProfileImageUrl { get; set; }
    
    // Whether the user completed initial profile customization
    public bool HasCompletedProfile { get; set; }

    // Whether the initial Spotify data sync (playlists, saved tracks, albums, artists) has completed
    public bool IsInitialSyncComplete { get; set; } = true;
    
    // Privacy setting for whether friends can join this user's active listening session
    public bool IsSessionJoinable { get; set; } = true;
    
    [Required]
    public string SpotifyAccessToken { get; set; } = string.Empty;
    
    [Required]
    public string SpotifyRefreshToken { get; set; } = string.Empty;
    
    public DateTime TokenExpiresAt { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }

    // Caching Top Artists (JSON blob)
    public string? TopArtistsJson { get; set; }
    public DateTime? TopArtistsUpdatedAt { get; set; }

    // Petal Shuffle tracking
    public bool IsPetalShuffleActive { get; set; }
    public string? OriginalContextUri { get; set; }
}
