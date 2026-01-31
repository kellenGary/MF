import api from "./api";

export interface PlaylistSyncResult {
  success: boolean;
  playlistsAdded: number;
  playlistsUpdated: number;
  playlistsRemoved: number;
  syncedAt: string;
}

export interface SavedTracksSyncResult {
  success: boolean;
  tracksAdded: number;
  tracksRemoved: number;
  totalLikedTracks: number;
  syncedAt: string;
}

class SpotifyApiService {
  // Sync playlists from Spotify to database
  async syncPlaylists(): Promise<PlaylistSyncResult> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/playlists/sync",
      {
        method: "POST",
      },
    );
    return await response.json();
  }

  // Sync saved/liked tracks from Spotify to database
  async syncSavedTracks(): Promise<SavedTracksSyncResult> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/saved-tracks/sync",
      {
        method: "POST",
      },
    );
    return await response.json();
  }

  // Spotify endpoints
  async getPlaylists(userId?: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/playlists",
    );
    return await response.json();
  }

  async getPlaylist(playlistId: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      `/api/spotify/playlists/${playlistId}`,
    );
    return await response.json();
  }

  // Fetch playlist with tracks from database (synced from Spotify)
  async getPlaylistSongs(playlistId: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      `/api/UserData/playlist/${playlistId}`,
    );
    return await response.json();
  }

  async getLikedSongs(userId?: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/liked-songs",
    );
    return await response.json();
  }

  async checkIfSongIsLiked(songId: string): Promise<boolean> {
    const response = await api.makeAuthenticatedRequest(
      `/api/spotify/songs/${songId}/liked`,
    );
    const data = await response.json();
    return data.isLiked;
  }

  async unlikeSong(songId: string): Promise<void> {
    await api.makeAuthenticatedRequest(`/api/spotify/songs/${songId}/unlike`, {
      method: "POST",
    });
  }

  async likeSong(songId: string): Promise<void> {
    await api.makeAuthenticatedRequest(`/api/spotify/songs/${songId}/like`, {
      method: "POST",
    });
  }

  async getSongDetails(songId: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      `/api/spotify/songs/${songId}`,
    );
    return await response.json();
  }

  async getNewReleases(): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/new-releases",
    );
    return await response.json();
  }

  async getRecentlyPlayed(userId?: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/recently-played",
    );
    return await response.json();
  }

  // Fetch album with tracks from database (or cached from Spotify)
  async getAlbumWithTracks(albumId: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      `/api/UserData/album/${albumId}`,
    );
    return await response.json();
  }
}

export default new SpotifyApiService();
