import listeningHistoryApi from "@/services/listeningHistoryApi";
import userDataApi from "@/services/userDataApi";
import { useCallback, useState } from "react";

type LoadingFlags = {
    tracks: boolean;
    albums: boolean;
    playlists: boolean;
    artists: boolean;
};

export default function useUserContent(userId?: number) {
    const [recentTracks, setRecentTracks] = useState<any[]>([]);
    const [likedTracks, setLikedTracks] = useState<any[]>([]);
    const [likedAlbums, setLikedAlbums] = useState<any[]>([]);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [followedArtists, setFollowedArtists] = useState<any[]>([]);

    const [loading, setLoading] = useState<LoadingFlags>({
        tracks: false,
        albums: false,
        playlists: false,
        artists: false,
    });

    const fetchRecentTracks = useCallback(async (limit = 50, offset = 0, force = false) => {
        if (!force && recentTracks.length > 0) return { items: recentTracks };
        setLoading((s) => ({ ...s, tracks: true }));
        try {
            // Use listeningHistory enriched endpoint so `track.id` is the DB native id
            const data = await listeningHistoryApi.getEnrichedListeningHistory(limit, offset, userId);
            setRecentTracks(data.items || []);
            return data;
        } finally {
            setLoading((s) => ({ ...s, tracks: false }));
        }
    }, [recentTracks.length, userId]);

    const fetchLikedTracks = useCallback(async (limit = 50, offset = 0, force = false) => {
        if (!force && likedTracks.length > 0) return { items: likedTracks };
        setLoading((s) => ({ ...s, tracks: true }));
        try {
            const data = await userDataApi.getLikedTracks(limit, offset, userId);
            setLikedTracks(data.items || []);
            return data;
        } finally {
            setLoading((s) => ({ ...s, tracks: false }));
        }
    }, [likedTracks.length, userId]);

    const fetchLikedAlbums = useCallback(async (limit = 50, offset = 0, force = false) => {
        if (!force && likedAlbums.length > 0) return { items: likedAlbums };
        setLoading((s) => ({ ...s, albums: true }));
        try {
            const data = await userDataApi.getLikedAlbums(limit, offset, userId);
            setLikedAlbums(data.items || []);
            return data;
        } finally {
            setLoading((s) => ({ ...s, albums: false }));
        }
    }, [likedAlbums.length, userId]);

    const fetchPlaylists = useCallback(async (force = false) => {
        if (!force && playlists.length > 0) return { items: playlists };
        setLoading((s) => ({ ...s, playlists: true }));
        try {
            const data = await userDataApi.getPlaylists(userId);
            setPlaylists(data.items || []);
            return data;
        } finally {
            setLoading((s) => ({ ...s, playlists: false }));
        }
    }, [playlists.length, userId]);

    const fetchFollowedArtists = useCallback(async (limit = 50, offset = 0, force = false) => {
        if (!force && followedArtists.length > 0) return { items: followedArtists };
        setLoading((s) => ({ ...s, artists: true }));
        try {
            const data = await userDataApi.getFollowedArtists(limit, offset, userId);
            setFollowedArtists(data.items || []);
            return data;
        } finally {
            setLoading((s) => ({ ...s, artists: false }));
        }
    }, [followedArtists.length, userId]);

    const refreshAll = useCallback(async () => {
        await Promise.all([
            fetchLikedTracks(50, 0, true),
            fetchLikedAlbums(50, 0, true),
            fetchPlaylists(true),
            fetchFollowedArtists(50, 0, true),
        ]);
    }, [fetchLikedAlbums, fetchLikedTracks, fetchFollowlistsSafeName(fetchPlaylists), fetchFollowedArtists]);

    // helper to avoid repeating nested field lookup logic in many screens
    const searchItems = useCallback((items: any[], searchFields: string[], query: string) => {
        if (!query || !query.trim()) return items;
        const q = query.toLowerCase();
        return items.filter((item) =>
            searchFields.some((field) => {
                const value = field.split(".").reduce((obj: any, key) => obj?.[key], item);
                return value?.toString().toLowerCase().includes(q);
            })
        );
    }, []);

    return {
        recentTracks,
        likedTracks,
        likedAlbums,
        playlists,
        followedArtists,
        loading,
        fetchRecentTracks,
        fetchLikedTracks,
        fetchLikedAlbums,
        fetchPlaylists,
        fetchFollowedArtists,
        refreshAll,
        searchItems,
    };
}

// Small workaround to keep lint happy when referencing functions inside refreshAll deps
function fetchFollowlistsSafeName(fn: any) { return fn; }
