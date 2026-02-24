using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Security.Claims;
using PetalAPI.Services;
using PetalAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/petal-shuffle")]
[Authorize]
public class PetalShuffleController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ISpotifyTokenService _spotifyTokenService;
    private readonly ILogger<PetalShuffleController> _logger;

    public PetalShuffleController(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        ISpotifyTokenService spotifyTokenService,
        ILogger<PetalShuffleController> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _spotifyTokenService = spotifyTokenService;
        _logger = logger;
    }

    [HttpGet("state")]
    public async Task<IActionResult> GetState()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            return Unauthorized(new { error = "Invalid token" });

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        return Ok(new { isActive = user.IsPetalShuffleActive });
    }

    [HttpPost("activate")]
    public async Task<IActionResult> Activate()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            return Unauthorized(new { error = "Invalid token" });

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
        var client = _httpClientFactory.CreateClient("Spotify");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        // 1. Get current player state to find context
        var playerResponse = await client.GetAsync("https://api.spotify.com/v1/me/player");
        if (!playerResponse.IsSuccessStatusCode || playerResponse.StatusCode == System.Net.HttpStatusCode.NoContent)
        {
            return BadRequest(new { error = "No active playback session found." });
        }

        var playerContent = await playerResponse.Content.ReadAsStringAsync();
        var playerJson = JsonSerializer.Deserialize<JsonElement>(playerContent);
        
        string? contextUri = null;
        if (playerJson.TryGetProperty("context", out var contextElement) && contextElement.ValueKind != JsonValueKind.Null)
        {
            if (contextElement.TryGetProperty("uri", out var uriElement))
            {
                contextUri = uriElement.GetString();
            }
        }

        if (string.IsNullOrEmpty(contextUri))
        {
            return BadRequest(new { error = "Cannot shuffle without an active context (playlist, album, etc)." });
        }

        // 2. Get the current playing track URI to ensure we start playback smoothly
        string? currentTrackUri = null;
        if (playerJson.TryGetProperty("item", out var itemElement) && itemElement.ValueKind != JsonValueKind.Null)
        {
            if (itemElement.TryGetProperty("uri", out var tUriElement))
            {
                currentTrackUri = tUriElement.GetString();
            }
        }

        // 3. Fetch tracks for the context
        var tracks = new List<string>();
        string contextType = contextUri.Split(':')[1];
        string contextId = contextUri.Split(':')[2];
        
        try
        {
            if (contextType == "playlist")
            {
                // Fetch up to 100 tracks from the playlist
                var plResponse = await client.GetAsync($"https://api.spotify.com/v1/playlists/{contextId}/tracks?limit=100");
                if (plResponse.IsSuccessStatusCode)
                {
                    var plContent = await plResponse.Content.ReadAsStringAsync();
                    var plJson = JsonSerializer.Deserialize<JsonElement>(plContent);
                    if (plJson.TryGetProperty("items", out var itemsElement) && itemsElement.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in itemsElement.EnumerateArray())
                        {
                            if (item.TryGetProperty("track", out var trackEl) && trackEl.TryGetProperty("uri", out var uEl))
                            {
                                var trackUri = uEl.GetString();
                                if (!string.IsNullOrEmpty(trackUri)) tracks.Add(trackUri);
                            }
                        }
                    }
                }
            }
            else if (contextType == "album")
            {
                var alResponse = await client.GetAsync($"https://api.spotify.com/v1/albums/{contextId}/tracks?limit=50");
                if (alResponse.IsSuccessStatusCode)
                {
                    var alContent = await alResponse.Content.ReadAsStringAsync();
                    var alJson = JsonSerializer.Deserialize<JsonElement>(alContent);
                    if (alJson.TryGetProperty("items", out var itemsElement) && itemsElement.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in itemsElement.EnumerateArray())
                        {
                            if (item.TryGetProperty("uri", out var uEl))
                            {
                                var trackUri = uEl.GetString();
                                if (!string.IsNullOrEmpty(trackUri)) tracks.Add(trackUri);
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch context tracks for {ContextUri}", contextUri);
        }

        if (tracks.Count == 0)
        {
            return BadRequest(new { error = "Could not retrieve tracks for shuffling." });
        }

        // 4. Shuffle tracks (excluding current track if we have it)
        var rng = new Random();
        var tracksToShuffle = tracks.Where(t => t != currentTrackUri).ToList();
        
        // Fisher-Yates shuffle
        int n = tracksToShuffle.Count;
        while (n > 1)
        {
            n--;
            int k = rng.Next(n + 1);
            string temp = tracksToShuffle[k];
            tracksToShuffle[k] = tracksToShuffle[n];
            tracksToShuffle[n] = temp;
        }

        // Combine current track + shuffled tracks (Spotify PUT play endpoint limits uris array, typically ~100 max)
        var finalUris = new List<string>();
        if (!string.IsNullOrEmpty(currentTrackUri))
        {
            finalUris.Add(currentTrackUri);
        }
        finalUris.AddRange(tracksToShuffle.Take(99)); // Keep under 100 limit

        // 5. Send PUT /me/player/play with custom uris array to override context queue
        var playUrl = "https://api.spotify.com/v1/me/player/play";
        var request = new HttpRequestMessage(HttpMethod.Put, playUrl);
        
        var requestBody = new Dictionary<string, object>
        {
            { "uris", finalUris }
        };

        var jsonContent = JsonSerializer.Serialize(requestBody);
        request.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
        
        var playResponse = await client.SendAsync(request);
        if (!playResponse.IsSuccessStatusCode)
        {
            var error = await playResponse.Content.ReadAsStringAsync();
            _logger.LogError("Failed to launch Petal Shuffle: {Error}", error);
            return StatusCode((int)playResponse.StatusCode, new { error = "Failed to start shuffled playback" });
        }

        // 6. Save state
        user.IsPetalShuffleActive = true;
        user.OriginalContextUri = contextUri;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, active = true });
    }

    [HttpPost("deactivate")]
    public async Task<IActionResult> Deactivate()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            return Unauthorized(new { error = "Invalid token" });

        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (!user.IsPetalShuffleActive)
        {
            return Ok(new { success = true, active = false });
        }

        var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
        var client = _httpClientFactory.CreateClient("Spotify");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        // 1. Find currently playing track
        var playerResponse = await client.GetAsync("https://api.spotify.com/v1/me/player");
        string? currentTrackUri = null;

        if (playerResponse.IsSuccessStatusCode && playerResponse.StatusCode != System.Net.HttpStatusCode.NoContent)
        {
            var playerContent = await playerResponse.Content.ReadAsStringAsync();
            var playerJson = JsonSerializer.Deserialize<JsonElement>(playerContent);
            
            if (playerJson.TryGetProperty("item", out var itemElement) && itemElement.ValueKind != JsonValueKind.Null)
            {
                if (itemElement.TryGetProperty("uri", out var tUriElement))
                {
                    currentTrackUri = tUriElement.GetString();
                }
            }
        }

        // 2. Play original context starting from current track (or beginning if unknown)
        if (!string.IsNullOrEmpty(user.OriginalContextUri))
        {
            var playUrl = "https://api.spotify.com/v1/me/player/play";
            var request = new HttpRequestMessage(HttpMethod.Put, playUrl);
            
            var requestBody = new Dictionary<string, object>
            {
                { "context_uri", user.OriginalContextUri }
            };

            if (!string.IsNullOrEmpty(currentTrackUri))
            {
                requestBody["offset"] = new Dictionary<string, string> { { "uri", currentTrackUri } };
            }

            var jsonContent = JsonSerializer.Serialize(requestBody);
            request.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
            
            // Fire and forget / log errors
            var playResponse = await client.SendAsync(request);
            if (!playResponse.IsSuccessStatusCode)
            {
                var error = await playResponse.Content.ReadAsStringAsync();
                _logger.LogWarning("Failed to restore context upon Petal Shuffle deactivation: {Error}", error);
            }
        }

        // 3. Clear state
        user.IsPetalShuffleActive = false;
        user.OriginalContextUri = null;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, active = false });
    }
}
