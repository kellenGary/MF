using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;
using System.Text.Json;

namespace PetalAPI.Services;

public class PostService : IPostService
{
    private readonly AppDbContext _context;
    private readonly ILogger<PostService> _logger;

    public PostService(AppDbContext context, ILogger<PostService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Create a listening session post from a list of recently played tracks
    /// </summary>
    public async Task<Post?> CreateListeningSessionPost(
        int userId, 
        List<SessionTrackMetadata> tracks,
        PostVisibility visibility = PostVisibility.Public)
    {
        if (tracks.Count == 0) return null;

        // Get the primary track (first or most played)
        var primaryTrackId = tracks.First().TrackId;

        var metadata = new ListeningSessionMetadata
        {
            Tracks = tracks,
            TotalDurationMs = tracks.Sum(t => t.DurationMs),
            TrackCount = tracks.Count
        };

        var post = new Post
        {
            UserId = userId,
            Type = PostType.ListeningSession,
            TrackId = primaryTrackId,
            CreatedAt = DateTime.UtcNow,
            Visibility = visibility,
            MetadataJson = JsonSerializer.Serialize(metadata)
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created listening session post {PostId} for user {UserId} with {TrackCount} tracks", 
            post.Id, userId, tracks.Count);

        return post;
    }

    /// <summary>
    /// Create a post when user likes a track
    /// </summary>
    public async Task<Post> CreateLikedTrackPost(int userId, int trackId, PostVisibility visibility = PostVisibility.Public)
    {
        var post = new Post
        {
            UserId = userId,
            Type = PostType.LikedTrack,
            TrackId = trackId,
            CreatedAt = DateTime.UtcNow,
            Visibility = visibility
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created liked track post {PostId} for user {UserId}", post.Id, userId);
        return post;
    }

    /// <summary>
    /// Create a post when user likes an album
    /// </summary>
    public async Task<Post> CreateLikedAlbumPost(int userId, int albumId, PostVisibility visibility = PostVisibility.Public)
    {
        var post = new Post
        {
            UserId = userId,
            Type = PostType.LikedAlbum,
            AlbumId = albumId,
            CreatedAt = DateTime.UtcNow,
            Visibility = visibility
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created liked album post {PostId} for user {UserId}", post.Id, userId);
        return post;
    }

    /// <summary>
    /// Create a post when user likes a playlist
    /// </summary>
    public async Task<Post> CreateLikedPlaylistPost(int userId, int playlistId, PostVisibility visibility = PostVisibility.Public)
    {
        var post = new Post
        {
            UserId = userId,
            Type = PostType.LikedPlaylist,
            PlaylistId = playlistId,
            CreatedAt = DateTime.UtcNow,
            Visibility = visibility
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created liked playlist post {PostId} for user {UserId}", post.Id, userId);
        return post;
    }

    /// <summary>
    /// Create a shared track post with optional caption
    /// </summary>
    public async Task<Post> CreateSharedTrackPost(int userId, int trackId, string? caption = null, PostVisibility visibility = PostVisibility.Public)
    {
        var metadata = new SharedPostMetadata { Caption = caption };

        var post = new Post
        {
            UserId = userId,
            Type = PostType.SharedTrack,
            TrackId = trackId,
            CreatedAt = DateTime.UtcNow,
            Visibility = visibility,
            MetadataJson = caption != null ? JsonSerializer.Serialize(metadata) : null
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created shared track post {PostId} for user {UserId}", post.Id, userId);
        return post;
    }

    /// <summary>
    /// Create a shared album post with optional caption
    /// </summary>
    public async Task<Post> CreateSharedAlbumPost(int userId, int albumId, string? caption = null, PostVisibility visibility = PostVisibility.Public)
    {
        var metadata = new SharedPostMetadata { Caption = caption };

        var post = new Post
        {
            UserId = userId,
            Type = PostType.SharedAlbum,
            AlbumId = albumId,
            CreatedAt = DateTime.UtcNow,
            Visibility = visibility,
            MetadataJson = caption != null ? JsonSerializer.Serialize(metadata) : null
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created shared album post {PostId} for user {UserId}", post.Id, userId);
        return post;
    }

    /// <summary>
    /// Create a shared playlist post with optional caption
    /// </summary>
    public async Task<Post> CreateSharedPlaylistPost(int userId, int playlistId, string? caption = null, PostVisibility visibility = PostVisibility.Public)
    {
        var metadata = new SharedPostMetadata { Caption = caption };

        var post = new Post
        {
            UserId = userId,
            Type = PostType.SharedPlaylist,
            PlaylistId = playlistId,
            CreatedAt = DateTime.UtcNow,
            Visibility = visibility,
            MetadataJson = caption != null ? JsonSerializer.Serialize(metadata) : null
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created shared playlist post {PostId} for user {UserId}", post.Id, userId);
        return post;
    }

    /// <summary>
    /// Create a shared artist post with optional caption
    /// </summary>
    public async Task<Post> CreateSharedArtistPost(int userId, int artistId, string? caption = null, PostVisibility visibility = PostVisibility.Public)
    {
        var metadata = new SharedPostMetadata { Caption = caption };

        var post = new Post
        {
            UserId = userId,
            Type = PostType.SharedArtist,
            ArtistId = artistId,
            CreatedAt = DateTime.UtcNow,
            Visibility = visibility,
            MetadataJson = caption != null ? JsonSerializer.Serialize(metadata) : null
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created shared artist post {PostId} for user {UserId}", post.Id, userId);
        return post;
    }

    /// <summary>
    /// Delete a post (only if user owns it)
    /// </summary>
    public async Task<bool> DeletePost(int userId, int postId)
    {
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId && p.UserId == userId && p.DeletedAt == null);
        if (post == null) return false;

        post.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Soft-deleted post {PostId} for user {UserId}", postId, userId);
        return true;
    }

    /// <summary>
    /// Like a post
    /// </summary>
    public async Task<bool> LikePost(int userId, int postId)
    {
        var existingLike = await _context.PostLikes
            .FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == userId);

        if (existingLike != null) return true; // Already liked

        // Ensure post exists
        var post = await _context.Posts.FindAsync(postId);
        if (post == null) return false;

        var like = new PostLike
        {
            UserId = userId,
            PostId = postId,
            CreatedAt = DateTime.UtcNow
        };

        _context.PostLikes.Add(like);
        await _context.SaveChangesAsync();

        return true;
    }

    /// <summary>
    /// Unlike a post
    /// </summary>
    public async Task<bool> UnlikePost(int userId, int postId)
    {
        var existingLike = await _context.PostLikes
            .FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == userId);

        if (existingLike == null) return true; // Already unliked (idempotent)

        _context.PostLikes.Remove(existingLike);
        await _context.SaveChangesAsync();

        return true;
    }

    /// <summary>
    /// Repost a post
    /// </summary>
    public async Task<Post?> RepostPost(int userId, int postId)
    {
        // Check if already reposted
        var existingRepost = await _context.Posts
            .FirstOrDefaultAsync(p => p.Type == PostType.Repost && 
                                      p.OriginalPostId == postId && 
                                      p.UserId == userId && 
                                      p.DeletedAt == null);

        if (existingRepost != null) return existingRepost;

        // Ensure original post exists
        var originalPost = await _context.Posts.FindAsync(postId);
        if (originalPost == null) return null;

        var repost = new Post
        {
            UserId = userId,
            Type = PostType.Repost,
            OriginalPostId = postId,
            CreatedAt = DateTime.UtcNow,
            Visibility = PostVisibility.Public // Reposts usually public or match original? defaulting to Public
        };

        _context.Posts.Add(repost);
        await _context.SaveChangesAsync();

        return repost;
    }

    /// <summary>
    /// Remove a repost
    /// </summary>
    public async Task<bool> RemoveRepost(int userId, int postId)
    {
        var repost = await _context.Posts
            .FirstOrDefaultAsync(p => p.Type == PostType.Repost && 
                                      p.OriginalPostId == postId && 
                                      p.UserId == userId && 
                                      p.DeletedAt == null);

        if (repost == null) return false;

        repost.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }
}

// Metadata classes for JSON serialization
public class ListeningSessionMetadata
{
    public List<SessionTrackMetadata> Tracks { get; set; } = new();
    public int TotalDurationMs { get; set; }
    public int TrackCount { get; set; }
}

public class SessionTrackMetadata
{
    public int TrackId { get; set; }
    public string? SpotifyId { get; set; }
    public string? Name { get; set; }
    public string? ArtistNames { get; set; }
    public string? AlbumImageUrl { get; set; }
    public int DurationMs { get; set; }
    public DateTime PlayedAt { get; set; }
}

public class SharedPostMetadata
{
    public string? Caption { get; set; }
}
