using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MFAPI.Data;
using MFAPI.Models;

namespace MFAPI.Services;

public interface IPlaylistSyncService
{
    Task<PlaylistSyncResult> SyncUserPlaylistsAsync(int userId, string accessToken);
}

public class PlaylistSyncResult
{
    public int PlaylistsAdded { get; set; }
    public int PlaylistsUpdated { get; set; }
    public int PlaylistsRemoved { get; set; }
    public DateTime SyncedAt { get; set; }
}

public class PlaylistSyncService : IPlaylistSyncService
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PlaylistSyncService> _logger;

    public PlaylistSyncService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<PlaylistSyncService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<PlaylistSyncResult> SyncUserPlaylistsAsync(int userId, string accessToken)
    {
        var result = new PlaylistSyncResult { SyncedAt = DateTime.UtcNow };

        try
        {
            // Fetch all playlists from Spotify (handle pagination)
            var spotifyPlaylists = await FetchAllPlaylistsFromSpotifyAsync(accessToken);
            
            _logger.LogInformation("[PlaylistSync] Fetched {Count} playlists from Spotify for user {UserId}", 
                spotifyPlaylists.Count, userId);

            // Get existing user playlists from database
            var existingUserPlaylists = await _context.UserPlaylists
                .Include(up => up.Playlist)
                .Where(up => up.UserId == userId)
                .ToListAsync();

            var existingPlaylistSpotifyIds = existingUserPlaylists
                .Select(up => up.Playlist.SpotifyId)
                .ToHashSet();

            var spotifyPlaylistIds = spotifyPlaylists
                .Select(p => p.GetProperty("id").GetString()!)
                .ToHashSet();

            // Process each Spotify playlist
            foreach (var spotifyPlaylist in spotifyPlaylists)
            {
                var spotifyId = spotifyPlaylist.GetProperty("id").GetString()!;
                var name = spotifyPlaylist.GetProperty("name").GetString() ?? "Untitled";
                var description = spotifyPlaylist.TryGetProperty("description", out var desc) 
                    ? desc.GetString() 
                    : null;
                var isPublic = spotifyPlaylist.TryGetProperty("public", out var pubProp) && pubProp.GetBoolean();
                var isCollaborative = spotifyPlaylist.TryGetProperty("collaborative", out var collabProp) && collabProp.GetBoolean();
                var snapshotId = spotifyPlaylist.TryGetProperty("snapshot_id", out var snapProp) 
                    ? snapProp.GetString() 
                    : null;
                
                // Get image URL
                string? imageUrl = null;
                if (spotifyPlaylist.TryGetProperty("images", out var images) && images.GetArrayLength() > 0)
                {
                    imageUrl = images[0].GetProperty("url").GetString();
                }

                // Get owner info
                string? ownerSpotifyId = null;
                if (spotifyPlaylist.TryGetProperty("owner", out var owner))
                {
                    ownerSpotifyId = owner.TryGetProperty("id", out var ownerIdProp) 
                        ? ownerIdProp.GetString() 
                        : null;
                }

                // Check if playlist already exists in database
                var existingPlaylist = await _context.Playlists
                    .FirstOrDefaultAsync(p => p.SpotifyId == spotifyId);

                if (existingPlaylist == null)
                {
                    // Create new playlist
                    var newPlaylist = new Playlist
                    {
                        SpotifyId = spotifyId,
                        Name = name,
                        Description = description,
                        OwnerSpotifyId = ownerSpotifyId,
                        Public = isPublic,
                        Collaborative = isCollaborative,
                        SnapshotId = snapshotId,
                        ImageUrl = imageUrl
                    };

                    // If the owner is this user, link the OwnerUserId
                    var user = await _context.Users.FindAsync(userId);
                    if (user != null && ownerSpotifyId == user.SpotifyId)
                    {
                        newPlaylist.OwnerUserId = userId;
                    }

                    try
                    {
                        _context.Playlists.Add(newPlaylist);
                        await _context.SaveChangesAsync();
                    }
                    catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
                    {
                        // Another process inserted this playlist, fetch it
                        _context.Entry(newPlaylist).State = EntityState.Detached;
                        existingPlaylist = await _context.Playlists.FirstOrDefaultAsync(p => p.SpotifyId == spotifyId);
                        if (existingPlaylist == null)
                        {
                            _logger.LogError(ex, "[PlaylistSync] Failed to create or fetch playlist: {SpotifyId}", spotifyId);
                            continue;
                        }
                        _logger.LogDebug("[PlaylistSync] Playlist already exists (race condition): {SpotifyId}", spotifyId);
                    }

                    // Create UserPlaylist relationship if we created a new playlist
                    if (existingPlaylist == null)
                    {
                        // Check if user-playlist relationship already exists
                        var existingUserPlaylist = await _context.UserPlaylists
                            .FirstOrDefaultAsync(up => up.UserId == userId && up.PlaylistId == newPlaylist.Id);
                        
                        if (existingUserPlaylist == null)
                        {
                            try
                            {
                                var userPlaylist = new UserPlaylist
                                {
                                    UserId = userId,
                                    PlaylistId = newPlaylist.Id,
                                    Relation = ownerSpotifyId == user?.SpotifyId 
                                        ? UserPlaylistRelation.Owner 
                                        : UserPlaylistRelation.Subscriber,
                                    FollowedAt = DateTime.UtcNow
                                };
                                _context.UserPlaylists.Add(userPlaylist);
                                await _context.SaveChangesAsync();
                            }
                            catch (DbUpdateException)
                            {
                                // UserPlaylist relationship already exists, ignore
                                _context.ChangeTracker.Clear();
                            }
                        }
                        
                        result.PlaylistsAdded++;
                        _logger.LogDebug("[PlaylistSync] Added new playlist: {PlaylistName} ({SpotifyId})", name, spotifyId);
                        continue;
                    }
                }
                
                // Update existing playlist if snapshot changed
                if (existingPlaylist.SnapshotId != snapshotId)
                {
                    existingPlaylist.Name = name;
                    existingPlaylist.Description = description;
                    existingPlaylist.Public = isPublic;
                    existingPlaylist.Collaborative = isCollaborative;
                    existingPlaylist.SnapshotId = snapshotId;
                    existingPlaylist.ImageUrl = imageUrl;
                    result.PlaylistsUpdated++;
                    _logger.LogDebug("[PlaylistSync] Updated playlist: {PlaylistName} ({SpotifyId})", name, spotifyId);
                }

                // Ensure user has relationship with playlist
                var userPlaylistExists = existingUserPlaylists.Any(up => up.Playlist.SpotifyId == spotifyId);
                if (!userPlaylistExists)
                {
                    var user = await _context.Users.FindAsync(userId);
                    
                    // Double-check in database to avoid race condition
                    var existingRelation = await _context.UserPlaylists
                        .FirstOrDefaultAsync(up => up.UserId == userId && up.PlaylistId == existingPlaylist.Id);
                    
                    if (existingRelation == null)
                    {
                        try
                        {
                            var userPlaylist = new UserPlaylist
                            {
                                UserId = userId,
                                PlaylistId = existingPlaylist.Id,
                                Relation = ownerSpotifyId == user?.SpotifyId 
                                    ? UserPlaylistRelation.Owner 
                                    : UserPlaylistRelation.Subscriber,
                                FollowedAt = DateTime.UtcNow
                            };
                            _context.UserPlaylists.Add(userPlaylist);
                            await _context.SaveChangesAsync();
                            result.PlaylistsAdded++;
                        }
                        catch (DbUpdateException)
                        {
                            // UserPlaylist relationship already exists, ignore
                            _context.ChangeTracker.Clear();
                        }
                    }
                }
            }

            // Remove playlists that user no longer follows on Spotify
            foreach (var existingUserPlaylist in existingUserPlaylists)
            {
                if (!spotifyPlaylistIds.Contains(existingUserPlaylist.Playlist.SpotifyId))
                {
                    _context.UserPlaylists.Remove(existingUserPlaylist);
                    result.PlaylistsRemoved++;
                    _logger.LogDebug("[PlaylistSync] Removed user playlist relationship: {PlaylistName}", 
                        existingUserPlaylist.Playlist.Name);
                }
            }

            // Update sync state
            var syncState = await _context.SpotifySyncStates
                .FirstOrDefaultAsync(s => s.UserId == userId);
            
            if (syncState == null)
            {
                syncState = new SpotifySyncState { UserId = userId };
                _context.SpotifySyncStates.Add(syncState);
            }

            // Use a timestamp to track when playlists were last synced
            syncState.LastFullSyncAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "[PlaylistSync] Sync complete for user {UserId}: Added={Added}, Updated={Updated}, Removed={Removed}",
                userId, result.PlaylistsAdded, result.PlaylistsUpdated, result.PlaylistsRemoved);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PlaylistSync] Error syncing playlists for user {UserId}", userId);
            throw;
        }
    }

    private async Task<List<JsonElement>> FetchAllPlaylistsFromSpotifyAsync(string accessToken)
    {
        var allPlaylists = new List<JsonElement>();
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var nextUrl = "https://api.spotify.com/v1/me/playlists?limit=50";

        while (!string.IsNullOrEmpty(nextUrl))
        {
            var response = await client.GetAsync(nextUrl);
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("[PlaylistSync] Spotify API error: {Error}", error);
                throw new Exception($"Failed to fetch playlists from Spotify: {response.StatusCode}");
            }

            var content = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement>(content);

            if (data.TryGetProperty("items", out var items))
            {
                foreach (var item in items.EnumerateArray())
                {
                    allPlaylists.Add(item);
                }
            }

            // Check for next page
            nextUrl = data.TryGetProperty("next", out var next) && next.ValueKind != JsonValueKind.Null
                ? next.GetString()
                : null;
        }

        return allPlaylists;
    }
}
