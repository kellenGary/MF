namespace MFAPI.Models;

public enum PostType
{
    Play = 0,
    LikedTrack = 1,
    LikedAlbum = 2,
    PlaylistAdd = 3
}

public enum PostVisibility
{
    Public = 0,
    Followers = 1
}

public class Post
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = default!;

    public PostType Type { get; set; }

    public int? TrackId { get; set; }
    public Track? Track { get; set; }

    public int? AlbumId { get; set; }
    public Album? Album { get; set; }

    public int? PlaylistId { get; set; }
    public Playlist? Playlist { get; set; }

    public int? SourceListeningHistoryId { get; set; }
    public ListeningHistory? SourceListeningHistory { get; set; }

    public DateTime CreatedAt { get; set; }
    public PostVisibility Visibility { get; set; }

    public string? MetadataJson { get; set; }
}
