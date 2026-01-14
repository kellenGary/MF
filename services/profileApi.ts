import api, { User } from "./api";

class ProfileApiService {
  // Profile endpoints
  async getProfile(): Promise<any> {
    const response = await api.makeAuthenticatedRequest('/api/profile');
    return await response.json();
  }

  async getAppProfile(userId?: number): Promise<User> {
    const endpoint = userId ? `/api/profile/app/${userId}` : '/api/profile/app';
    const response = await api.makeAuthenticatedRequest(endpoint);
    return await response.json();
  }

  async updateAppProfile(payload: Partial<Pick<User, 'displayName' | 'handle' | 'bio'>>): Promise<User> {
    const response = await api.makeAuthenticatedRequest('/api/profile/app', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return await response.json();
  }

  async getProfileStats(): Promise<any> {
    const response = await api.makeAuthenticatedRequest('/api/profile/stats');
    return await response.json();
  }

  async checkHandleExists(handle: string): Promise<boolean> {
    const response = await api.makeAuthenticatedRequest(`/api/profile/handle-exists?handle=${encodeURIComponent(handle)}`);
    const data = await response.json();
    return data.exists;
  }
}

export default new ProfileApiService();