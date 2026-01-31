using PetalAPI.Models;

namespace PetalAPI.Services;

public interface IPostService
{
    Task<Post?> CreateListeningSessionPost(int userId, List<SessionTrackMetadata> tracks, PostVisibility visibility = PostVisibility.Public);
    Task<Post> CreateLikedTrackPost(int userId, int trackId, PostVisibility visibility = PostVisibility.Public);
    Task<Post> CreateLikedAlbumPost(int userId, int albumId, PostVisibility visibility = PostVisibility.Public);
    Task<Post> CreateLikedPlaylistPost(int userId, int playlistId, PostVisibility visibility = PostVisibility.Public);
    Task<Post> CreateSharedTrackPost(int userId, int trackId, string? caption = null, PostVisibility visibility = PostVisibility.Public);
    Task<Post> CreateSharedAlbumPost(int userId, int albumId, string? caption = null, PostVisibility visibility = PostVisibility.Public);
    Task<Post> CreateSharedPlaylistPost(int userId, int playlistId, string? caption = null, PostVisibility visibility = PostVisibility.Public);
    Task<Post> CreateSharedArtistPost(int userId, int artistId, string? caption = null, PostVisibility visibility = PostVisibility.Public);
    Task<bool> DeletePost(int userId, int postId);
}
