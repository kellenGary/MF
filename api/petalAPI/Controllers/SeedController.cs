using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;
using System.Text.Json;

namespace PetalAPI.Controllers;

/// <summary>
/// Development-only seeding endpoints. Not for production use.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SeedController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<SeedController> _logger;

    // ─── Static seed catalogue ────────────────────────────────────────────────

    private static readonly (string SpotifyId, string Name, string Genres, string? ImageUrl)[] SeedArtists =
    {
        ("seed_artist_001", "The Echo Waves",        "[\"indie rock\",\"alternative\"]",  "https://api.dicebear.com/7.x/shapes/svg?seed=echowaves"),
        ("seed_artist_002", "Luna Cipher",           "[\"electronic\",\"synth-pop\"]",    "https://api.dicebear.com/7.x/shapes/svg?seed=lunacipher"),
        ("seed_artist_003", "Marble Street",         "[\"pop\",\"r&b\"]",                 "https://api.dicebear.com/7.x/shapes/svg?seed=marblestreet"),
        ("seed_artist_004", "Dark River Collective", "[\"hip-hop\",\"rap\"]",             "https://api.dicebear.com/7.x/shapes/svg?seed=darkriver"),
        ("seed_artist_005", "Solstice",              "[\"ambient\",\"post-rock\"]",       "https://api.dicebear.com/7.x/shapes/svg?seed=solstice"),
    };

    // (SpotifyId, Name, ArtistSpotifyId, AlbumType, Label, ImageUrl, TrackNames[])
    private static readonly (string SpotifyId, string Name, string ArtistSpotifyId, string AlbumType, string Label, string ImageUrl, string[] TrackNames)[] SeedAlbums =
    {
        (
            "seed_album_001", "Tidal Drift", "seed_artist_001", "album", "Indie Records",
            "https://api.dicebear.com/7.x/shapes/svg?seed=tidaldrift",
            new[] { "Undertow", "Coastline", "The Break", "Salt Air", "Drift Away" }
        ),
        (
            "seed_album_002", "Neon Hours", "seed_artist_002", "album", "Cipher Audio",
            "https://api.dicebear.com/7.x/shapes/svg?seed=neonhours",
            new[] { "Strobe", "After Midnight", "Pulse", "Ultraviolet", "Static Dream" }
        ),
        (
            "seed_album_003", "Marble Cuts Vol. 1", "seed_artist_003", "album", "Street Label",
            "https://api.dicebear.com/7.x/shapes/svg?seed=marblecuts",
            new[] { "Marble Arch", "Gold Rush", "Surface Tension", "Polished", "Clean Slate" }
        ),
    };

    // track SpotifyIds are derived: seed_track_{albumIdx}_{trackIdx}  e.g. seed_track_1_1
    private static readonly int[] TrackDurations =
        { 193000, 210000, 247000, 182000, 221000, 237000, 198000, 204000, 256000, 175000, 229000, 215000, 243000, 188000, 261000 };

    private static readonly string[] PostCaptions =
    {
        "This track has been on repeat all week. Can't stop.",
        "Finally found the perfect album for late-night drives.",
        "The production on this is absolutely stunning.",
        "Discovered this artist last month and I'm obsessed.",
        "This song hits different when it's raining outside.",
        "Perfect background music for getting work done.",
        "Can't believe I slept on this album for so long.",
        "The guitar work on this track is incredibly intricate.",
    };

    private static readonly string[] CommentTexts =
    {
        "This song is such a vibe.",
        "Been on loop for days, no regrets.",
        "The bridge in this track is incredible.",
        "Underrated gem right here.",
        "Production is top tier.",
        "This takes me back to summer 2022.",
        "Absolutely slaps from start to finish.",
        "Can't listen to this without getting emotional.",
    };

    private static readonly string[] Handles =
    {
        "melodyfan", "beatdrop", "nightowl", "crestwave", "velvetecho",
        "neonpulse", "driftwood", "prismtune", "harborbeat", "solarsound",
    };

    private static readonly string[] DisplayNames =
    {
        "Melody Fan", "Beat Drop", "Night Owl", "Crest Wave", "Velvet Echo",
        "Neon Pulse", "Driftwood", "Prism Tune", "Harbor Beat", "Solar Sound",
    };

    // ─── Constructor ──────────────────────────────────────────────────────────

    public SeedController(AppDbContext context, ILogger<SeedController> logger)
    {
        _context = context;
        _logger  = logger;
    }

    // ─── Individual seed endpoints ─────────────────────────────────────────────

    /// <summary>Seeds 5 artists with deterministic Spotify IDs (idempotent).</summary>
    [HttpPost("artists")]
    public async Task<IActionResult> SeedArtistsEndpoint()
    {
        var existing = await _context.Artists
            .Where(a => a.SpotifyId.StartsWith("seed_artist_"))
            .Select(a => a.SpotifyId)
            .ToHashSetAsync();

        var toAdd = SeedArtists
            .Where(a => !existing.Contains(a.SpotifyId))
            .Select(a => new Artist
            {
                SpotifyId  = a.SpotifyId,
                Name       = a.Name,
                GenresJson = a.Genres,
                ImageUrl   = a.ImageUrl,
            }).ToList();

        _context.Artists.AddRange(toAdd);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} artists.", toAdd.Count);
        return Ok(new { message = $"Seeded {toAdd.Count} artists ({existing.Count} already existed).", added = toAdd.Select(a => a.Name) });
    }

    /// <summary>
    /// Seeds 3 albums with 5 tracks each (15 tracks total). Idempotent.
    /// Requires seed artists to already exist.
    /// </summary>
    [HttpPost("albums-and-tracks")]
    public async Task<IActionResult> SeedAlbumsAndTracksEndpoint()
    {
        var artistMap = await _context.Artists
            .Where(a => a.SpotifyId.StartsWith("seed_artist_"))
            .ToDictionaryAsync(a => a.SpotifyId, a => a.Id);

        if (artistMap.Count == 0)
            return BadRequest("No seed artists found. Call POST /api/seed/artists first.");

        var existingAlbums = await _context.Albums
            .Where(a => a.SpotifyId.StartsWith("seed_album_"))
            .Select(a => a.SpotifyId)
            .ToHashSetAsync();

        var existingTracks = await _context.Tracks
            .Where(t => t.SpotifyId.StartsWith("seed_track_"))
            .Select(t => t.SpotifyId)
            .ToHashSetAsync();

        int durationIdx = 0, albumsAdded = 0, tracksAdded = 0;

        for (int ai = 0; ai < SeedAlbums.Length; ai++)
        {
            var albumData = SeedAlbums[ai];

            Album album;
            if (!existingAlbums.Contains(albumData.SpotifyId))
            {
                album = new Album
                {
                    SpotifyId   = albumData.SpotifyId,
                    Name        = albumData.Name,
                    AlbumType   = albumData.AlbumType,
                    Label       = albumData.Label,
                    ImageUrl    = albumData.ImageUrl,
                    ReleaseDate = new DateTime(2022 + ai, 4 + ai, 10 + ai),
                    TotalTracks = albumData.TrackNames.Length,
                };
                _context.Albums.Add(album);
                await _context.SaveChangesAsync();
                albumsAdded++;
            }
            else
            {
                album = await _context.Albums.FirstAsync(a => a.SpotifyId == albumData.SpotifyId);
            }

            var artistId = artistMap.GetValueOrDefault(albumData.ArtistSpotifyId);

            for (int ti = 0; ti < albumData.TrackNames.Length; ti++)
            {
                var trackSpotifyId = $"seed_track_{ai + 1}_{ti + 1}";
                if (existingTracks.Contains(trackSpotifyId)) { durationIdx++; continue; }

                var track = new Track
                {
                    SpotifyId  = trackSpotifyId,
                    Name       = albumData.TrackNames[ti],
                    DurationMs = TrackDurations[durationIdx % TrackDurations.Length],
                    AlbumId    = album.Id,
                    Explicit   = false,
                    Isrc       = $"USSEED{(ai + 1):D2}{(ti + 1):D4}",
                };
                _context.Tracks.Add(track);
                await _context.SaveChangesAsync();

                _context.AlbumTracks.Add(new AlbumTrack { AlbumId = album.Id, TrackId = track.Id, Position = ti });

                if (artistId != 0)
                    _context.TrackArtists.Add(new TrackArtist { TrackId = track.Id, ArtistId = artistId, ArtistOrder = 0 });

                await _context.SaveChangesAsync();
                tracksAdded++;
                durationIdx++;
            }
        }

        _logger.LogInformation("Seeded {Albums} albums and {Tracks} tracks.", albumsAdded, tracksAdded);
        return Ok(new { message = $"Seeded {albumsAdded} albums and {tracksAdded} tracks." });
    }

    /// <summary>Seeds 2 playlists with seed tracks. Idempotent.</summary>
    [HttpPost("playlists")]
    public async Task<IActionResult> SeedPlaylistsEndpoint()
    {
        var trackIds = await _context.Tracks
            .Where(t => t.SpotifyId.StartsWith("seed_track_"))
            .Select(t => t.Id)
            .ToListAsync();

        if (trackIds.Count == 0)
            return BadRequest("No seed tracks found. Call POST /api/seed/albums-and-tracks first.");

        var existing = await _context.Playlists
            .Where(p => p.SpotifyId.StartsWith("seed_playlist_"))
            .Select(p => p.SpotifyId)
            .ToHashSetAsync();

        var defs = new[]
        {
            ("seed_playlist_001", "Seed Chill Vibes",  "A relaxing mix for winding down.",   trackIds.Take(6).ToList()),
            ("seed_playlist_002", "Seed Workout Hits", "High energy tracks to keep moving.",  trackIds.Skip(3).Take(6).ToList()),
        };

        int added = 0;
        foreach (var (spotifyId, name, desc, tracks) in defs)
        {
            if (existing.Contains(spotifyId)) continue;

            var playlist = new Playlist
            {
                SpotifyId      = spotifyId,
                Name           = name,
                Description    = desc,
                Public         = true,
                TrackCount     = tracks.Count,
                OwnerSpotifyId = "seed_owner",
            };
            _context.Playlists.Add(playlist);
            await _context.SaveChangesAsync();

            for (int i = 0; i < tracks.Count; i++)
                _context.PlaylistTracks.Add(new PlaylistTrack { PlaylistId = playlist.Id, TrackId = tracks[i], Position = i, AddedAt = DateTime.UtcNow.AddDays(-i) });

            await _context.SaveChangesAsync();
            added++;
        }

        _logger.LogInformation("Seeded {Count} playlists.", added);
        return Ok(new { message = $"Seeded {added} playlists ({existing.Count} already existed)." });
    }

    /// <summary>Seeds up to <paramref name="count"/> users with fake profiles. Idempotent by handle.</summary>
    [HttpPost("users")]
    public async Task<IActionResult> SeedUsersEndpoint([FromQuery] int count = 10)
    {
        if (count <= 0 || count > 100)
            return BadRequest("Count must be between 1 and 100.");

        var existingHandles = await _context.Users
            .Where(u => u.Handle != null && u.Handle.StartsWith("seed_"))
            .Select(u => u.Handle!)
            .ToHashSetAsync();

        var baseTime = DateTime.UtcNow;
        var rng      = new Random(42);
        var users    = new List<User>();

        for (int i = 0; i < count; i++)
        {
            var idx    = i % Handles.Length;
            var suffix = i < Handles.Length ? "" : $"_{i / Handles.Length}";
            var handle = $"seed_{Handles[idx]}{suffix}";
            if (existingHandles.Contains(handle)) continue;

            var id = Guid.NewGuid().ToString("N")[..8];
            users.Add(new User
            {
                SpotifyId           = $"seed_spot_{id}",
                DisplayName         = $"{DisplayNames[idx]}{(suffix == "" ? "" : " " + (i / Handles.Length + 1))}",
                Handle              = handle,
                Bio                 = "Seeded test user. Music lover from day one.",
                Email               = $"{handle}@petal.test",
                ProfileImageUrl     = $"https://api.dicebear.com/7.x/avataaars/svg?seed={handle}",
                HasCompletedProfile = true,
                IsSessionJoinable   = true,
                SpotifyAccessToken  = $"mock_access_{id}",
                SpotifyRefreshToken = $"mock_refresh_{id}",
                TokenExpiresAt      = baseTime.AddHours(1),
                CreatedAt           = baseTime.AddDays(-rng.Next(1, 90)),
                UpdatedAt           = baseTime,
            });
        }

        _context.Users.AddRange(users);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} users.", users.Count);
        return Ok(new
        {
            message = $"Seeded {users.Count} users ({existingHandles.Count} already existed).",
            users   = users.Select(u => new { u.Id, u.Handle, u.DisplayName }),
        });
    }

    /// <summary>Seeds random follows between seed users.</summary>
    [HttpPost("follows")]
    public async Task<IActionResult> SeedFollowsEndpoint([FromQuery] int count = 20)
    {
        if (count <= 0 || count > 500)
            return BadRequest("Count must be between 1 and 500.");

        var userIds = await _context.Users
            .Where(u => u.Handle != null && u.Handle.StartsWith("seed_"))
            .Select(u => u.Id)
            .ToListAsync();

        if (userIds.Count < 2)
            return BadRequest("Need at least 2 seed users. Call POST /api/seed/users first.");

        var existingFollows = await _context.Follows
            .Select(f => new { f.FollowerUserId, f.FolloweeUserId })
            .ToHashSetAsync();

        var rng     = new Random();
        var follows = new List<Follow>();
        var seen    = new HashSet<(int, int)>(existingFollows.Select(f => (f.FollowerUserId, f.FolloweeUserId)));

        for (int i = 0; i < count * 5 && follows.Count < count; i++)
        {
            var a = userIds[rng.Next(userIds.Count)];
            var b = userIds[rng.Next(userIds.Count)];
            if (a == b || !seen.Add((a, b))) continue;
            follows.Add(new Follow { FollowerUserId = a, FolloweeUserId = b, CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 30)) });
        }

        _context.Follows.AddRange(follows);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} follows.", follows.Count);
        return Ok(new { message = $"Seeded {follows.Count} follows." });
    }

    /// <summary>Seeds listening history for seed users (random plays over the past 30 days).</summary>
    [HttpPost("listening-history")]
    public async Task<IActionResult> SeedListeningHistoryEndpoint([FromQuery] int playsPerUser = 15)
    {
        if (playsPerUser <= 0 || playsPerUser > 200)
            return BadRequest("playsPerUser must be between 1 and 200.");

        var users  = await _context.Users.Where(u => u.Handle != null && u.Handle.StartsWith("seed_")).Select(u => u.Id).ToListAsync();
        var tracks = await _context.Tracks.Where(t => t.SpotifyId.StartsWith("seed_track_")).Select(t => new { t.Id, t.DurationMs }).ToListAsync();

        if (users.Count == 0)    return BadRequest("No seed users found.");
        if (tracks.Count == 0)   return BadRequest("No seed tracks found.");

        var rng     = new Random();
        var entries = new List<ListeningHistory>();

        foreach (var userId in users)
        {
            for (int i = 0; i < playsPerUser; i++)
            {
                var track    = tracks[rng.Next(tracks.Count)];
                var playedAt = DateTime.UtcNow.AddDays(-rng.Next(0, 30)).AddHours(-rng.Next(0, 24));
                var msPlayed = (int)(track.DurationMs * (0.5 + rng.NextDouble() * 0.5));
                entries.Add(new ListeningHistory
                {
                    UserId       = userId,
                    TrackId      = track.Id,
                    PlayedAt     = playedAt,
                    MsPlayed     = msPlayed,
                    Source       = ListeningSource.SpotifyApi,
                    DeviceType   = rng.Next(2) == 0 ? "smartphone" : "computer",
                    CountsAsPlay = msPlayed >= 15000,
                    DedupeKey    = $"seed_{userId}_{track.Id}_{playedAt:yyyyMMddHHmmss}_{i}",
                });
            }
        }

        _context.ListeningHistory.AddRange(entries);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} listening history entries.", entries.Count);
        return Ok(new { message = $"Seeded {entries.Count} listening history entries across {users.Count} users." });
    }

    /// <summary>Seeds liked tracks/albums and followed artists for seed users.</summary>
    [HttpPost("user-library")]
    public async Task<IActionResult> SeedUserLibraryEndpoint()
    {
        var userIds   = await _context.Users.Where(u => u.Handle != null && u.Handle.StartsWith("seed_")).Select(u => u.Id).ToListAsync();
        var trackIds  = await _context.Tracks.Where(t => t.SpotifyId.StartsWith("seed_track_")).Select(t => t.Id).ToListAsync();
        var albumIds  = await _context.Albums.Where(a => a.SpotifyId.StartsWith("seed_album_")).Select(a => a.Id).ToListAsync();
        var artistIds = await _context.Artists.Where(a => a.SpotifyId.StartsWith("seed_artist_")).Select(a => a.Id).ToListAsync();

        if (userIds.Count == 0) return BadRequest("No seed users found.");

        var rng     = new Random(99);
        var lt      = new List<UserLikedTrack>();
        var la      = new List<UserLikedAlbum>();
        var fa      = new List<UserFollowedArtist>();
        var seen_lt = new HashSet<(int, int)>();
        var seen_la = new HashSet<(int, int)>();
        var seen_fa = new HashSet<(int, int)>();

        foreach (var userId in userIds)
        {
            foreach (var trackId in trackIds.OrderBy(_ => rng.Next()).Take(rng.Next(3, 9)))
                if (seen_lt.Add((userId, trackId)))
                    lt.Add(new UserLikedTrack { UserId = userId, TrackId = trackId, LikedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 60)) });

            foreach (var albumId in albumIds.OrderBy(_ => rng.Next()).Take(rng.Next(0, 3)))
                if (seen_la.Add((userId, albumId)))
                    la.Add(new UserLikedAlbum { UserId = userId, AlbumId = albumId, LikedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 60)) });

            foreach (var artistId in artistIds.OrderBy(_ => rng.Next()).Take(rng.Next(1, 4)))
                if (seen_fa.Add((userId, artistId)))
                    fa.Add(new UserFollowedArtist { UserId = userId, ArtistId = artistId, FollowedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 60)) });
        }

        _context.UserLikedTracks.AddRange(lt);
        _context.UserLikedAlbums.AddRange(la);
        _context.UserFollowedArtists.AddRange(fa);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Seeded user library.", likedTracks = lt.Count, likedAlbums = la.Count, followedArtists = fa.Count });
    }

    /// <summary>Seeds Songs of the Day for seed users (one per user per day for the past week).</summary>
    [HttpPost("songs-of-day")]
    public async Task<IActionResult> SeedSongsOfDayEndpoint([FromQuery] int days = 7)
    {
        if (days <= 0 || days > 30)
            return BadRequest("days must be between 1 and 30.");

        var userIds  = await _context.Users.Where(u => u.Handle != null && u.Handle.StartsWith("seed_")).Select(u => u.Id).ToListAsync();
        var trackIds = await _context.Tracks.Where(t => t.SpotifyId.StartsWith("seed_track_")).Select(t => t.Id).ToListAsync();

        if (userIds.Count == 0)  return BadRequest("No seed users found.");
        if (trackIds.Count == 0) return BadRequest("No seed tracks found.");

        var existing = await _context.SongsOfTheDay
            .Select(s => new { s.UserId, s.Date })
            .ToHashSetAsync();

        var rng   = new Random(7);
        var sotds = new List<SongOfTheDay>();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        foreach (var userId in userIds)
        {
            for (int d = 0; d < days; d++)
            {
                var date = today.AddDays(-d);
                if (existing.Any(e => e.UserId == userId && e.Date == date)) continue;
                sotds.Add(new SongOfTheDay { UserId = userId, TrackId = trackIds[rng.Next(trackIds.Count)], Date = date });
            }
        }

        _context.SongsOfTheDay.AddRange(sotds);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} Songs of the Day.", sotds.Count);
        return Ok(new { message = $"Seeded {sotds.Count} Songs of the Day." });
    }

    /// <summary>Seeds posts for seed users (Play, LikedTrack, SharedTrack, etc.).</summary>
    [HttpPost("posts")]
    public async Task<IActionResult> SeedPostsEndpoint([FromQuery] int postsPerUser = 5)
    {
        if (postsPerUser <= 0 || postsPerUser > 50)
            return BadRequest("postsPerUser must be between 1 and 50.");

        var userIds   = await _context.Users.Where(u => u.Handle != null && u.Handle.StartsWith("seed_")).Select(u => u.Id).ToListAsync();
        var trackIds  = await _context.Tracks.Where(t => t.SpotifyId.StartsWith("seed_track_")).Select(t => t.Id).ToListAsync();
        var albumIds  = await _context.Albums.Where(a => a.SpotifyId.StartsWith("seed_album_")).Select(a => a.Id).ToListAsync();
        var artistIds = await _context.Artists.Where(a => a.SpotifyId.StartsWith("seed_artist_")).Select(a => a.Id).ToListAsync();

        if (userIds.Count == 0)  return BadRequest("No seed users found.");
        if (trackIds.Count == 0) return BadRequest("No seed tracks found.");

        var rng   = new Random();
        var posts = new List<Post>();
        var postTypePool = new[] { 0, 1, 2, 10, 11, 13 }; // Play, LikedTrack, LikedAlbum, SharedTrack, SharedAlbum, SharedArtist

        foreach (var userId in userIds)
        {
            for (int i = 0; i < postsPerUser; i++)
            {
                var postType = (PostType)postTypePool[rng.Next(postTypePool.Length)];
                var caption  = PostCaptions[rng.Next(PostCaptions.Length)];
                var post     = new Post
                {
                    UserId     = userId,
                    Type       = postType,
                    CreatedAt  = DateTime.UtcNow.AddDays(-rng.Next(0, 30)).AddHours(-rng.Next(0, 24)),
                    Visibility = PostVisibility.Public,
                };

                switch (postType)
                {
                    case PostType.Play:
                    case PostType.LikedTrack:
                    case PostType.SharedTrack:
                        post.TrackId      = trackIds[rng.Next(trackIds.Count)];
                        post.MetadataJson = postType == PostType.SharedTrack ? JsonSerializer.Serialize(new { caption }) : null;
                        break;
                    case PostType.LikedAlbum:
                    case PostType.SharedAlbum:
                        post.AlbumId      = albumIds[rng.Next(albumIds.Count)];
                        post.MetadataJson = postType == PostType.SharedAlbum ? JsonSerializer.Serialize(new { caption }) : null;
                        break;
                    case PostType.SharedArtist:
                        post.ArtistId     = artistIds[rng.Next(artistIds.Count)];
                        post.MetadataJson = JsonSerializer.Serialize(new { caption });
                        break;
                    default:
                        post.TrackId = trackIds[rng.Next(trackIds.Count)];
                        break;
                }
                posts.Add(post);
            }
        }

        _context.Posts.AddRange(posts);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} posts.", posts.Count);
        return Ok(new { message = $"Seeded {posts.Count} posts across {userIds.Count} users." });
    }

    /// <summary>Seeds random post likes from seed users.</summary>
    [HttpPost("post-likes")]
    public async Task<IActionResult> SeedPostLikesEndpoint([FromQuery] int likesPerUser = 10)
    {
        if (likesPerUser <= 0 || likesPerUser > 100)
            return BadRequest("likesPerUser must be between 1 and 100.");

        var userIds = await _context.Users
            .Where(u => u.Handle != null && u.Handle.StartsWith("seed_"))
            .Select(u => u.Id)
            .ToListAsync();

        var postIds = await _context.Posts
            .Where(p => p.DeletedAt == null)
            .Select(p => new { p.Id, p.UserId })
            .ToListAsync();

        if (userIds.Count == 0) return BadRequest("No seed users found.");
        if (postIds.Count == 0) return BadRequest("No posts found. Call POST /api/seed/posts first.");

        var existing = await _context.PostLikes
            .Select(pl => new { pl.UserId, pl.PostId })
            .ToHashSetAsync();

        var rng   = new Random();
        var likes = new List<PostLike>();
        var seen  = new HashSet<(int, int)>(existing.Select(e => (e.UserId, e.PostId)));

        foreach (var userId in userIds)
            foreach (var post in postIds.Where(p => p.UserId != userId).OrderBy(_ => rng.Next()).Take(likesPerUser))
                if (seen.Add((userId, post.Id)))
                    likes.Add(new PostLike { UserId = userId, PostId = post.Id, CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(0, 20)) });

        _context.PostLikes.AddRange(likes);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} post likes.", likes.Count);
        return Ok(new { message = $"Seeded {likes.Count} post likes." });
    }

    /// <summary>Seeds follow and like notifications for seed users.</summary>
    [HttpPost("notifications")]
    public async Task<IActionResult> SeedNotificationsEndpoint()
    {
        var notifs = await SeedNotificationsInternal();
        return Ok(new { message = $"Seeded {notifs} notifications." });
    }

    /// <summary>Seeds comments on seed tracks and albums.</summary>
    [HttpPost("comments")]
    public async Task<IActionResult> SeedCommentsEndpoint([FromQuery] int commentsPerEntity = 3)
    {
        if (commentsPerEntity <= 0 || commentsPerEntity > 20)
            return BadRequest("commentsPerEntity must be between 1 and 20.");

        var count = await SeedCommentsInternal(commentsPerEntity);
        return Ok(new { message = $"Seeded {count} comments." });
    }

    // ─── Wipe endpoint ─────────────────────────────────────────────────────────

    /// <summary>
    /// DESTRUCTIVE: Deletes ALL data from all tables. For development use only.
    /// </summary>
    [HttpDelete("wipe")]
    public async Task<IActionResult> WipeAll()
    {
        await WipeAllInternal();
        _logger.LogWarning("All data wiped via DELETE /api/seed/wipe.");
        return Ok(new { message = "All tables wiped." });
    }

    // ─── Master seed endpoint ──────────────────────────────────────────────────

    /// <summary>
    /// DESTRUCTIVE: Wipes the entire database then re-seeds it in the correct dependency order.
    /// One call to fully reset and populate a dev environment.
    /// Query params: userCount (default 10), playsPerUser (default 15), postsPerUser (default 5).
    /// </summary>
    [HttpPost("all")]
    public async Task<IActionResult> SeedAll(
        [FromQuery] int userCount    = 10,
        [FromQuery] int playsPerUser = 15,
        [FromQuery] int postsPerUser = 5)
    {
        var results   = new List<string>();
        var sw        = System.Diagnostics.Stopwatch.StartNew();

        // 1 – Wipe
        await WipeAllInternal();
        results.Add("✓ Wiped all tables");

        // 2 – Music catalogue
        var artists = await SeedArtistsInternal();
        results.Add($"✓ Seeded {artists} artists");

        var (albums, tracks) = await SeedAlbumsAndTracksInternal();
        results.Add($"✓ Seeded {albums} albums and {tracks} tracks");

        var playlists = await SeedPlaylistsInternal();
        results.Add($"✓ Seeded {playlists} playlists");

        // 3 – Users & social graph
        var users = await SeedUsersInternal(userCount);
        results.Add($"✓ Seeded {users} users");

        var follows = await SeedFollowsInternal(userCount * 2);
        results.Add($"✓ Seeded {follows} follows");

        // 4 – User activity
        var plays = await SeedListeningHistoryInternal(playsPerUser);
        results.Add($"✓ Seeded {plays} listening history entries");

        var (likedTracks, likedAlbums, followedArtists) = await SeedUserLibraryInternal();
        results.Add($"✓ Seeded user library ({likedTracks} liked tracks, {likedAlbums} liked albums, {followedArtists} followed artists)");

        var sotds = await SeedSongsOfDayInternal(7);
        results.Add($"✓ Seeded {sotds} Songs of the Day");

        // 5 – Feed content
        var posts = await SeedPostsInternal(postsPerUser);
        results.Add($"✓ Seeded {posts} posts");

        var postLikes = await SeedPostLikesInternal(10);
        results.Add($"✓ Seeded {postLikes} post likes");

        var notifs = await SeedNotificationsInternal();
        results.Add($"✓ Seeded {notifs} notifications");

        var comments = await SeedCommentsInternal(3);
        results.Add($"✓ Seeded {comments} comments");

        sw.Stop();
        _logger.LogInformation("SeedAll completed in {Ms}ms.", sw.ElapsedMilliseconds);

        return Ok(new
        {
            message = $"Database fully seeded in {sw.ElapsedMilliseconds}ms.",
            steps   = results,
            summary = new
            {
                artists, albums, tracks, playlists,
                users, follows,
                listeningHistoryEntries = plays,
                likedTracks, likedAlbums, followedArtists,
                songsOfTheDay = sotds,
                posts, postLikes,
                notifications = notifs,
                comments,
            }
        });
    }

    // ─── Private helpers shared by HTTP actions and SeedAll ───────────────────

    private async Task WipeAllInternal()
    {
        // Delete in reverse FK dependency order
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM Comments");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM RecommendationDismissals");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM Notifications");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM PostLikes");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM Reposts");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM Posts");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM SongsOfTheDay");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM ListeningSessionTracks");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM ListeningSessions");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM ListeningHistory");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM UserFollowedArtists");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM UserLikedAlbums");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM UserLikedTracks");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM UserPlaylists");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM PlaylistTracks");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM Playlists");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM SpotifySyncStates");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM Follows");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM TrackArtists");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM AlbumTracks");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM Tracks");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM Albums");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM Artists");
        await _context.Database.ExecuteSqlRawAsync("DELETE FROM Users");
    }

    private async Task<int> SeedArtistsInternal()
    {
        var artists = SeedArtists.Select(a => new Artist
        {
            SpotifyId  = a.SpotifyId,
            Name       = a.Name,
            GenresJson = a.Genres,
            ImageUrl   = a.ImageUrl,
        }).ToList();
        _context.Artists.AddRange(artists);
        await _context.SaveChangesAsync();
        return artists.Count;
    }

    private async Task<(int albums, int tracks)> SeedAlbumsAndTracksInternal()
    {
        var artistMap = await _context.Artists
            .Where(a => a.SpotifyId.StartsWith("seed_artist_"))
            .ToDictionaryAsync(a => a.SpotifyId, a => a.Id);

        int albumsAdded = 0, tracksAdded = 0, durationIdx = 0;

        for (int ai = 0; ai < SeedAlbums.Length; ai++)
        {
            var data  = SeedAlbums[ai];
            var album = new Album
            {
                SpotifyId   = data.SpotifyId,
                Name        = data.Name,
                AlbumType   = data.AlbumType,
                Label       = data.Label,
                ImageUrl    = data.ImageUrl,
                ReleaseDate = new DateTime(2022 + ai, 4 + ai, 10 + ai),
                TotalTracks = data.TrackNames.Length,
            };
            _context.Albums.Add(album);
            await _context.SaveChangesAsync();
            albumsAdded++;

            var artistId = artistMap.GetValueOrDefault(data.ArtistSpotifyId);

            for (int ti = 0; ti < data.TrackNames.Length; ti++)
            {
                var track = new Track
                {
                    SpotifyId  = $"seed_track_{ai + 1}_{ti + 1}",
                    Name       = data.TrackNames[ti],
                    DurationMs = TrackDurations[durationIdx % TrackDurations.Length],
                    AlbumId    = album.Id,
                    Explicit   = false,
                    Isrc       = $"USSEED{(ai + 1):D2}{(ti + 1):D4}",
                };
                _context.Tracks.Add(track);
                await _context.SaveChangesAsync();

                _context.AlbumTracks.Add(new AlbumTrack { AlbumId = album.Id, TrackId = track.Id, Position = ti });
                if (artistId != 0)
                    _context.TrackArtists.Add(new TrackArtist { TrackId = track.Id, ArtistId = artistId, ArtistOrder = 0 });

                await _context.SaveChangesAsync();
                tracksAdded++;
                durationIdx++;
            }
        }

        return (albumsAdded, tracksAdded);
    }

    private async Task<int> SeedPlaylistsInternal()
    {
        var trackIds = await _context.Tracks
            .Where(t => t.SpotifyId.StartsWith("seed_track_"))
            .Select(t => t.Id)
            .ToListAsync();

        var defs = new[]
        {
            ("seed_playlist_001", "Seed Chill Vibes",  "A relaxing mix for winding down.",   trackIds.Take(6).ToList()),
            ("seed_playlist_002", "Seed Workout Hits", "High energy tracks to keep moving.",  trackIds.Skip(3).Take(6).ToList()),
        };

        int added = 0;
        foreach (var (spotifyId, name, desc, tracks) in defs)
        {
            var playlist = new Playlist
            {
                SpotifyId      = spotifyId,
                Name           = name,
                Description    = desc,
                Public         = true,
                TrackCount     = tracks.Count,
                OwnerSpotifyId = "seed_owner",
            };
            _context.Playlists.Add(playlist);
            await _context.SaveChangesAsync();

            for (int i = 0; i < tracks.Count; i++)
                _context.PlaylistTracks.Add(new PlaylistTrack { PlaylistId = playlist.Id, TrackId = tracks[i], Position = i, AddedAt = DateTime.UtcNow.AddDays(-i) });

            await _context.SaveChangesAsync();
            added++;
        }
        return added;
    }

    private async Task<int> SeedUsersInternal(int count)
    {
        var baseTime = DateTime.UtcNow;
        var rng      = new Random(42);
        var users    = new List<User>();

        for (int i = 0; i < count; i++)
        {
            var idx    = i % Handles.Length;
            var suffix = i < Handles.Length ? "" : $"_{i / Handles.Length}";
            var handle = $"seed_{Handles[idx]}{suffix}";
            var id     = Guid.NewGuid().ToString("N")[..8];
            users.Add(new User
            {
                SpotifyId           = $"seed_spot_{id}",
                DisplayName         = $"{DisplayNames[idx]}{(suffix == "" ? "" : " " + (i / Handles.Length + 1))}",
                Handle              = handle,
                Bio                 = "Seeded test user. Music lover from day one.",
                Email               = $"{handle}@petal.test",
                ProfileImageUrl     = $"https://api.dicebear.com/7.x/avataaars/svg?seed={handle}",
                HasCompletedProfile = true,
                IsSessionJoinable   = true,
                SpotifyAccessToken  = $"mock_access_{id}",
                SpotifyRefreshToken = $"mock_refresh_{id}",
                TokenExpiresAt      = baseTime.AddHours(1),
                CreatedAt           = baseTime.AddDays(-rng.Next(1, 90)),
                UpdatedAt           = baseTime,
            });
        }
        _context.Users.AddRange(users);
        await _context.SaveChangesAsync();
        return users.Count;
    }

    private async Task<int> SeedFollowsInternal(int count)
    {
        var userIds = await _context.Users
            .Where(u => u.Handle != null && u.Handle.StartsWith("seed_"))
            .Select(u => u.Id)
            .ToListAsync();

        var rng     = new Random();
        var follows = new List<Follow>();
        var seen    = new HashSet<(int, int)>();

        for (int i = 0; i < count * 5 && follows.Count < count; i++)
        {
            var a = userIds[rng.Next(userIds.Count)];
            var b = userIds[rng.Next(userIds.Count)];
            if (a == b || !seen.Add((a, b))) continue;
            follows.Add(new Follow { FollowerUserId = a, FolloweeUserId = b, CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 30)) });
        }
        _context.Follows.AddRange(follows);
        await _context.SaveChangesAsync();
        return follows.Count;
    }

    private async Task<int> SeedListeningHistoryInternal(int playsPerUser)
    {
        var users   = await _context.Users.Where(u => u.Handle != null && u.Handle.StartsWith("seed_")).Select(u => u.Id).ToListAsync();
        var tracks  = await _context.Tracks.Where(t => t.SpotifyId.StartsWith("seed_track_")).Select(t => new { t.Id, t.DurationMs }).ToListAsync();
        var rng     = new Random();
        var entries = new List<ListeningHistory>();

        foreach (var userId in users)
        {
            for (int i = 0; i < playsPerUser; i++)
            {
                var track    = tracks[rng.Next(tracks.Count)];
                var playedAt = DateTime.UtcNow.AddDays(-rng.Next(0, 30)).AddHours(-rng.Next(0, 24));
                var msPlayed = (int)(track.DurationMs * (0.5 + rng.NextDouble() * 0.5));
                entries.Add(new ListeningHistory
                {
                    UserId       = userId,
                    TrackId      = track.Id,
                    PlayedAt     = playedAt,
                    MsPlayed     = msPlayed,
                    Source       = ListeningSource.SpotifyApi,
                    DeviceType   = rng.Next(2) == 0 ? "smartphone" : "computer",
                    CountsAsPlay = msPlayed >= 15000,
                    DedupeKey    = $"seed_{userId}_{track.Id}_{playedAt:yyyyMMddHHmmss}_{i}",
                });
            }
        }
        _context.ListeningHistory.AddRange(entries);
        await _context.SaveChangesAsync();
        return entries.Count;
    }

    private async Task<(int likedTracks, int likedAlbums, int followedArtists)> SeedUserLibraryInternal()
    {
        var userIds   = await _context.Users.Where(u => u.Handle != null && u.Handle.StartsWith("seed_")).Select(u => u.Id).ToListAsync();
        var trackIds  = await _context.Tracks.Where(t => t.SpotifyId.StartsWith("seed_track_")).Select(t => t.Id).ToListAsync();
        var albumIds  = await _context.Albums.Where(a => a.SpotifyId.StartsWith("seed_album_")).Select(a => a.Id).ToListAsync();
        var artistIds = await _context.Artists.Where(a => a.SpotifyId.StartsWith("seed_artist_")).Select(a => a.Id).ToListAsync();

        var rng     = new Random(99);
        var lt      = new List<UserLikedTrack>();
        var la      = new List<UserLikedAlbum>();
        var fa      = new List<UserFollowedArtist>();
        var seen_lt = new HashSet<(int, int)>();
        var seen_la = new HashSet<(int, int)>();
        var seen_fa = new HashSet<(int, int)>();

        foreach (var userId in userIds)
        {
            foreach (var trackId in trackIds.OrderBy(_ => rng.Next()).Take(rng.Next(3, 9)))
                if (seen_lt.Add((userId, trackId)))
                    lt.Add(new UserLikedTrack { UserId = userId, TrackId = trackId, LikedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 60)) });

            foreach (var albumId in albumIds.OrderBy(_ => rng.Next()).Take(rng.Next(0, 3)))
                if (seen_la.Add((userId, albumId)))
                    la.Add(new UserLikedAlbum { UserId = userId, AlbumId = albumId, LikedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 60)) });

            foreach (var artistId in artistIds.OrderBy(_ => rng.Next()).Take(rng.Next(1, 4)))
                if (seen_fa.Add((userId, artistId)))
                    fa.Add(new UserFollowedArtist { UserId = userId, ArtistId = artistId, FollowedAt = DateTime.UtcNow.AddDays(-rng.Next(1, 60)) });
        }

        _context.UserLikedTracks.AddRange(lt);
        _context.UserLikedAlbums.AddRange(la);
        _context.UserFollowedArtists.AddRange(fa);
        await _context.SaveChangesAsync();
        return (lt.Count, la.Count, fa.Count);
    }

    private async Task<int> SeedSongsOfDayInternal(int days)
    {
        var userIds  = await _context.Users.Where(u => u.Handle != null && u.Handle.StartsWith("seed_")).Select(u => u.Id).ToListAsync();
        var trackIds = await _context.Tracks.Where(t => t.SpotifyId.StartsWith("seed_track_")).Select(t => t.Id).ToListAsync();
        var rng      = new Random(7);
        var today    = DateOnly.FromDateTime(DateTime.UtcNow);
        var sotds    = new List<SongOfTheDay>();

        foreach (var userId in userIds)
            for (int d = 0; d < days; d++)
                sotds.Add(new SongOfTheDay { UserId = userId, TrackId = trackIds[rng.Next(trackIds.Count)], Date = today.AddDays(-d) });

        _context.SongsOfTheDay.AddRange(sotds);
        await _context.SaveChangesAsync();
        return sotds.Count;
    }

    private async Task<int> SeedPostsInternal(int postsPerUser)
    {
        var userIds   = await _context.Users.Where(u => u.Handle != null && u.Handle.StartsWith("seed_")).Select(u => u.Id).ToListAsync();
        var trackIds  = await _context.Tracks.Where(t => t.SpotifyId.StartsWith("seed_track_")).Select(t => t.Id).ToListAsync();
        var albumIds  = await _context.Albums.Where(a => a.SpotifyId.StartsWith("seed_album_")).Select(a => a.Id).ToListAsync();
        var artistIds = await _context.Artists.Where(a => a.SpotifyId.StartsWith("seed_artist_")).Select(a => a.Id).ToListAsync();

        var rng          = new Random();
        var posts        = new List<Post>();
        var postTypePool = new[] { 0, 1, 2, 10, 11, 13 };

        foreach (var userId in userIds)
        {
            for (int i = 0; i < postsPerUser; i++)
            {
                var postType = (PostType)postTypePool[rng.Next(postTypePool.Length)];
                var caption  = PostCaptions[rng.Next(PostCaptions.Length)];
                var post     = new Post
                {
                    UserId     = userId,
                    Type       = postType,
                    CreatedAt  = DateTime.UtcNow.AddDays(-rng.Next(0, 30)).AddHours(-rng.Next(0, 24)),
                    Visibility = PostVisibility.Public,
                };

                switch (postType)
                {
                    case PostType.Play:
                    case PostType.LikedTrack:
                    case PostType.SharedTrack:
                        post.TrackId      = trackIds[rng.Next(trackIds.Count)];
                        post.MetadataJson = postType == PostType.SharedTrack ? JsonSerializer.Serialize(new { caption }) : null;
                        break;
                    case PostType.LikedAlbum:
                    case PostType.SharedAlbum:
                        post.AlbumId      = albumIds[rng.Next(albumIds.Count)];
                        post.MetadataJson = postType == PostType.SharedAlbum ? JsonSerializer.Serialize(new { caption }) : null;
                        break;
                    case PostType.SharedArtist:
                        post.ArtistId     = artistIds[rng.Next(artistIds.Count)];
                        post.MetadataJson = JsonSerializer.Serialize(new { caption });
                        break;
                    default:
                        post.TrackId = trackIds[rng.Next(trackIds.Count)];
                        break;
                }
                posts.Add(post);
            }
        }

        _context.Posts.AddRange(posts);
        await _context.SaveChangesAsync();
        return posts.Count;
    }

    private async Task<int> SeedPostLikesInternal(int likesPerUser)
    {
        var userIds = await _context.Users.Where(u => u.Handle != null && u.Handle.StartsWith("seed_")).Select(u => u.Id).ToListAsync();
        var postIds = await _context.Posts.Where(p => p.DeletedAt == null).Select(p => new { p.Id, p.UserId }).ToListAsync();
        if (postIds.Count == 0) return 0;

        var rng   = new Random();
        var likes = new List<PostLike>();
        var seen  = new HashSet<(int, int)>();

        foreach (var userId in userIds)
            foreach (var post in postIds.Where(p => p.UserId != userId).OrderBy(_ => rng.Next()).Take(likesPerUser))
                if (seen.Add((userId, post.Id)))
                    likes.Add(new PostLike { UserId = userId, PostId = post.Id, CreatedAt = DateTime.UtcNow.AddDays(-rng.Next(0, 20)) });

        _context.PostLikes.AddRange(likes);
        await _context.SaveChangesAsync();
        return likes.Count;
    }

    private async Task<int> SeedNotificationsInternal()
    {
        var follows = await _context.Follows
            .Select(f => new { f.FollowerUserId, f.FolloweeUserId, f.CreatedAt })
            .ToListAsync();

        var likes = await _context.PostLikes
            .Select(pl => new { ActorUserId = pl.UserId, TargetUserId = pl.Post.UserId, PostId = pl.PostId, pl.CreatedAt })
            .ToListAsync();

        var rng   = new Random();
        var notifs = new List<Notification>();

        foreach (var f in follows)
            notifs.Add(new Notification
            {
                UserId      = f.FolloweeUserId,
                ActorUserId = f.FollowerUserId,
                Type        = NotificationType.Follow,
                IsRead      = rng.Next(2) == 0,
                CreatedAt   = f.CreatedAt,
            });

        foreach (var l in likes.Where(l => l.ActorUserId != l.TargetUserId))
            notifs.Add(new Notification
            {
                UserId      = l.TargetUserId,
                ActorUserId = l.ActorUserId,
                Type        = NotificationType.Like,
                PostId      = l.PostId,
                IsRead      = rng.Next(2) == 0,
                CreatedAt   = l.CreatedAt,
            });

        _context.Notifications.AddRange(notifs);
        await _context.SaveChangesAsync();
        return notifs.Count;
    }

    private async Task<int> SeedCommentsInternal(int commentsPerEntity)
    {
        var userIds         = await _context.Users.Where(u => u.Handle != null && u.Handle.StartsWith("seed_")).Select(u => u.Id).ToListAsync();
        var trackSpotifyIds = await _context.Tracks.Where(t => t.SpotifyId.StartsWith("seed_track_")).Select(t => t.SpotifyId).ToListAsync();
        var albumSpotifyIds = await _context.Albums.Where(a => a.SpotifyId.StartsWith("seed_album_")).Select(a => a.SpotifyId).ToListAsync();

        if (userIds.Count == 0) return 0;

        var rng      = new Random();
        var comments = new List<Comment>();
        var now      = DateTime.UtcNow;

        void Add(CommentEntityType type, string entityId)
        {
            for (int i = 0; i < commentsPerEntity; i++)
                comments.Add(new Comment
                {
                    AuthorId   = userIds[rng.Next(userIds.Count)],
                    EntityType = type,
                    EntityId   = entityId,
                    Text       = CommentTexts[rng.Next(CommentTexts.Length)],
                    CreatedAt  = now.AddDays(-rng.Next(0, 14)).AddHours(-rng.Next(0, 24)),
                });
        }

        foreach (var id in trackSpotifyIds) Add(CommentEntityType.Track, id);
        foreach (var id in albumSpotifyIds) Add(CommentEntityType.Album, id);

        _context.Comments.AddRange(comments);
        await _context.SaveChangesAsync();
        return comments.Count;
    }
}
