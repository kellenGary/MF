import api, { User } from "./api";

export interface ProfileData {
  id: number;
  spotifyId: string;
  displayName: string;
  handle: string;
  bio: string;
  profileImageUrl: string;
  totalUniqueTracks: number;
  totalPlaybacks: number;
  recentPlaysLast7Days: number;
  totalArtistsHeard: number;
  totalAlbumsHeard: number;
  totalFollowers: number;
  totalFollowing: number;
  lastPlayedAt: Date;
  isSessionJoinable: boolean;
}

export interface CompatibilityBreakdownFactor {
  name: string;
  score: number;
  count: number;
  label: string;
  hasData: boolean;
}

export interface CompatibilityResult {
  score: number;
  insufficientData: boolean;
  breakdown: CompatibilityBreakdownFactor[];
}

class ProfileApiService {
  // Profile endpoints
  async getProfile(): Promise<User> {
    const response = await api.makeAuthenticatedRequest("/api/profile");
    return await response.json();
  }

  async getAppProfile(userId?: number): Promise<ProfileData> {
    const endpoint = userId ? `/api/profile/app/${userId}` : "/api/profile/app";
    const response = await api.makeAuthenticatedRequest(endpoint);
    return await response.json();
  }

  async updateAppProfile(
    payload: Partial<
      Pick<User, "displayName" | "handle" | "bio" | "isSessionJoinable">
    >,
  ): Promise<User> {
    const response = await api.makeAuthenticatedRequest("/api/profile/app", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return await response.json();
  }

  async getCurrentPlayback(
    userId: number,
  ): Promise<{
    isPlaying: boolean;
    track?: { id: string; name: string; uri: string };
  }> {
    const response = await api.makeAuthenticatedRequest(
      `/api/profile/app/${userId}/current-playback`,
    );
    if (!response.ok) {
      if (response.status === 403 || response.status === 404) {
        return { isPlaying: false };
      }
      throw new Error("Failed to fetch current playback");
    }
    return await response.json();
  }

  async getTopArtists(userId?: number): Promise<any> {
    const endpoint = userId
      ? `/api/profile/top-artists/${userId}`
      : "/api/profile/top-artists";
    const response = await api.makeAuthenticatedRequest(endpoint);
    return await response.json();
  }

  async checkHandleExists(handle: string): Promise<boolean> {
    const response = await api.makeAuthenticatedRequest(
      `/api/profile/handle-exists?handle=${encodeURIComponent(handle)}`,
    );
    const data = await response.json();
    return data.exists;
  }

  async deleteAccount(): Promise<void> {
    const response = await api.makeAuthenticatedRequest("/api/profile", {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete account");
    }
  }

  async getSotd(userId?: number): Promise<any> {
    const endpoint = userId
      ? `/api/SongOfTheDay/${userId}`
      : "/api/SongOfTheDay";
    const response = await api.makeAuthenticatedRequest(endpoint);
    return await response.json();
  }

  async getCompatibility(userId: number): Promise<CompatibilityResult> {
    const response = await api.makeAuthenticatedRequest(
      `/api/users/${userId}/compatibility`,
    );
    return await response.json();
  }
}

export default new ProfileApiService();
