import api from "./api";

export type PostVisibility = "Public" | "Followers";

export interface ShareResponse {
  message: string;
  postId: number;
}

export interface SelectedContent {
  type: "song" | "album" | "playlist" | "artist";
  id: string | number; // can be DB id (number) or Spotify id (string)
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  subtitle: string; // artist name, track count, etc.
}

class PostApiService {
  /**
   * Share a track to the feed
   */
  async shareTrack(
    spotifyId: string,
    caption?: string,
    visibility: PostVisibility = "Public",
    trackId?: number
  ): Promise<ShareResponse> {
    const body: any = { caption, visibility };
    if (trackId) {
      body.trackId = trackId;
    } else {
      body.spotifyId = spotifyId;
    }
    
    const response = await api.makeAuthenticatedRequest("/api/post/share/track", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to share track");
    }

    return await response.json();
  }

  /**
   * Share an album to the feed
   */
  async shareAlbum(
    spotifyId: string,
    caption?: string,
    visibility: PostVisibility = "Public",
    albumId?: number
  ): Promise<ShareResponse> {
    const body: any = { caption, visibility };
    if (albumId) {
      body.albumId = albumId;
    } else {
      body.spotifyId = spotifyId;
    }
    
    const response = await api.makeAuthenticatedRequest("/api/post/share/album", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to share album");
    }

    return await response.json();
  }

  /**
   * Share a playlist to the feed
   */
  async sharePlaylist(
    spotifyId: string,
    caption?: string,
    visibility: PostVisibility = "Public",
    playlistId?: number
  ): Promise<ShareResponse> {
    const body: any = { caption, visibility };
    if (playlistId) {
      body.playlistId = playlistId;
    } else {
      body.spotifyId = spotifyId;
    }
    
    const response = await api.makeAuthenticatedRequest("/api/post/share/playlist", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to share playlist");
    }

    return await response.json();
  }

  /**
   * Share an artist to the feed
   */
  async shareArtist(
    spotifyId: string,
    caption?: string,
    visibility: PostVisibility = "Public",
    artistId?: number
  ): Promise<ShareResponse> {
    const body: any = { caption, visibility };
    if (artistId) {
      body.artistId = artistId;
    } else {
      body.spotifyId = spotifyId;
    }
    
    const response = await api.makeAuthenticatedRequest("/api/post/share/artist", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to share artist");
    }

    return await response.json();
  }

  /**
   * Share content based on type
   */
  async shareContent(
    content: SelectedContent,
    caption?: string,
    visibility: PostVisibility = "Public"
  ): Promise<ShareResponse> {
    // If id is numeric, use it as the DB ID; otherwise fall back to spotifyId
    const dbId = typeof content.id === 'number' ? content.id : undefined;
    
    switch (content.type) {
      case "song":
        return this.shareTrack(content.spotifyId, caption, visibility, dbId);
      case "album":
        return this.shareAlbum(content.spotifyId, caption, visibility, dbId);
      case "playlist":
        return this.sharePlaylist(content.spotifyId, caption, visibility, dbId);
      case "artist":
        return this.shareArtist(content.spotifyId, caption, visibility, dbId);
      default:
        throw new Error("Invalid content type");
    }
  }
}

const postApi = new PostApiService();
export default postApi;
