import api from "./api";

interface Playlist {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { id: string };
}

interface Album {
  id: string;
  name: string;
  imageUrl: string | null;
  releaseDate: string | null;
  albumType: string | null;
}

interface Artist {
  id: string;
  name: string;
}

interface Track {
  id: string;
  name: string;
  durationMs: number;
  explicit: boolean;
  popularity: number | null;
  isrc: string | null;
  artists: Artist[];
  album: Album | null;
}

interface LikedTrackItem {
  likedAt: string;
  track: Track;
}

interface RecentlyPlayedItem {
  track: Track;
  played_at: string;
}

interface LikedAlbumItem {
  likedAt: string;
  album: {
    id: string;
    name: string;
    imageUrl: string | null;
    releaseDate: string | null;
    albumType: string | null;
    totalTracks: number | null;
  };
}

interface FollowedArtistItem {
  followedAt: string;
  artist: {
    id: string;
    name: string;
    imageUrl: string | null;
    popularity: number | null;
  };
}

class UserDataService {
  /**
   * Gets user's playlists from the database (synced from Spotify)
   * Much faster than hitting Spotify API every time
   * @param userId - Optional user ID to fetch playlists for another user
   */
  async getPlaylists(userId?: number): Promise<{ items: Playlist[] }> {
    const endpoint = userId 
      ? `/api/userdata/playlists/${userId}`
      : "/api/userdata/playlists";
    
    const response = await api.makeAuthenticatedRequest(endpoint);

    if (!response.ok) {
      throw new Error(`Failed to fetch playlists: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Gets user's liked tracks from the database (synced from Spotify)
   * Uses UserLikedTracksEnriched view for efficient querying
   * Includes pagination support
   * @param userId - Optional user ID to fetch liked tracks for another user
   */
  async getLikedTracks(limit: number = 50, offset: number = 0, userId?: number): Promise<{
    items: LikedTrackItem[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    params.append("limit", Math.min(Math.max(limit, 1), 1000).toString());
    params.append("offset", Math.max(offset, 0).toString());

    const endpoint = userId
      ? `/api/userdata/liked-tracks/${userId}?${params.toString()}`
      : `/api/userdata/liked-tracks?${params.toString()}`;

    const response = await api.makeAuthenticatedRequest(endpoint);

    if (!response.ok) {
      throw new Error(`Failed to fetch liked tracks: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Gets user's recently played tracks from the database (synced from Spotify)
   * Shows unique tracks in order of most recent listen
   * Includes pagination support
   * @param userId - Optional user ID to fetch recently played for another user
   */
  async getRecentlyPlayed(limit: number = 50, offset: number = 0, userId?: number): Promise<{
    items: RecentlyPlayedItem[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    params.append("limit", Math.min(Math.max(limit, 1), 1000).toString());
    params.append("offset", Math.max(offset, 0).toString());

    const endpoint = userId
      ? `/api/userdata/recently-played/${userId}?${params.toString()}`
      : `/api/userdata/recently-played?${params.toString()}`;
    
    console.log('Fetching recently played with URL:', endpoint);

    const response = await api.makeAuthenticatedRequest(endpoint);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Recently played error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(
        `Failed to fetch recently played: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    return await response.json();
  }

  /**
   * Gets user's liked albums from the database (synced from Spotify)
   * @param userId - Optional user ID to fetch liked albums for another user
   */
  async getLikedAlbums(limit: number = 50, offset: number = 0, userId?: number): Promise<{
    items: LikedAlbumItem[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    params.append("limit", Math.min(Math.max(limit, 1), 1000).toString());
    params.append("offset", Math.max(offset, 0).toString());

    const endpoint = userId
      ? `/api/userdata/liked-albums/${userId}?${params.toString()}`
      : `/api/userdata/liked-albums?${params.toString()}`;

    const response = await api.makeAuthenticatedRequest(endpoint);

    if (!response.ok) {
      throw new Error(`Failed to fetch liked albums: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Gets user's followed artists from the database (synced from Spotify)
   * @param userId - Optional user ID to fetch followed artists for another user
   */
  async getFollowedArtists(limit: number = 50, offset: number = 0, userId?: number): Promise<{
    items: FollowedArtistItem[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    params.append("limit", Math.min(Math.max(limit, 1), 1000).toString());
    params.append("offset", Math.max(offset, 0).toString());

    const endpoint = userId
      ? `/api/userdata/followed-artists/${userId}?${params.toString()}`
      : `/api/userdata/followed-artists?${params.toString()}`;

    const response = await api.makeAuthenticatedRequest(endpoint);

    if (!response.ok) {
      throw new Error(`Failed to fetch followed artists: ${response.statusText}`);
    }

    return await response.json();
  }
}

export default new UserDataService();
