using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;

namespace PetalAPI.Services;

public class SpotifySyncBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SpotifySyncBackgroundService> _logger;
    private readonly TimeSpan _syncInterval = TimeSpan.FromMinutes(10);

    public SpotifySyncBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<SpotifySyncBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[SpotifySyncBackground] Service starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SyncAllUsersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SpotifySyncBackground] Error during sync cycle.");
            }

            _logger.LogInformation("[SpotifySyncBackground] Waiting {Interval} for next sync cycle.", _syncInterval);
            await Task.Delay(_syncInterval, stoppingToken);
        }

        _logger.LogInformation("[SpotifySyncBackground] Service stopping.");
    }

    private async Task SyncAllUsersAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var historyService = scope.ServiceProvider.GetRequiredService<IListeningHistoryService>();
        var tokenService = scope.ServiceProvider.GetRequiredService<ISpotifyTokenService>();

        // Get all users who have a Spotify refresh token
        var users = await context.Users
            .Where(u => !string.IsNullOrEmpty(u.SpotifyRefreshToken))
            .Select(u => new { u.Id, u.DisplayName })
            .ToListAsync(stoppingToken);

        _logger.LogInformation("[SpotifySyncBackground] Starting sync for {Count} users.", users.Count);

        foreach (var user in users)
        {
            if (stoppingToken.IsCancellationRequested) break;

            try
            {
                _logger.LogInformation("[SpotifySyncBackground] Syncing history for user {DisplayName} ({UserId})", user.DisplayName, user.Id);
                
                var accessToken = await tokenService.GetValidAccessTokenAsync(user.Id);
                if (accessToken != null)
                {
                    await historyService.SyncRecentlyPlayedAsync(user.Id, accessToken, includeLocation: false);
                }
                else
                {
                    _logger.LogWarning("[SpotifySyncBackground] Could not get valid access token for user {UserId}", user.Id);
                }
            }
            catch (SpotifyAuthRevokedException)
            {
                // Tokens already cleared by SpotifyTokenService — user won't appear in next sync cycle.
                _logger.LogWarning(
                    "[SpotifySyncBackground] Spotify auth revoked for user {UserId} ({DisplayName}). Skipping until re-authentication.",
                    user.Id, user.DisplayName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SpotifySyncBackground] Error syncing history for user {UserId}", user.Id);
            }
        }

        _logger.LogInformation("[SpotifySyncBackground] Sync cycle complete.");
    }
}
