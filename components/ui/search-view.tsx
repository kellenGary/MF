import { ThemedText } from "@/components/ui/themed-text";
import TrackList, { ListItem } from "@/components/ui/track-list";
import { useScrollContext } from "@/contexts/ScrollContext";
import { useTheme } from "@/contexts/ThemeContext";
import searchApi, { SearchResults } from "@/services/searchApi";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SearchViewProps {
    query: string;
}

export default function SearchView({ query }: SearchViewProps) {
    const router = useRouter();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { collapse } = useScrollContext();

    const [results, setResults] = useState<SearchResults>({ users: [], tracks: [], albums: [], artists: [], playlists: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            if (!query.trim()) {
                setResults({ users: [], tracks: [], albums: [], artists: [], playlists: [] });
                return;
            }

            setLoading(true);
            try {
                const data = await searchApi.search(query);
                setResults({
                    users: data.users ?? [],
                    tracks: data.tracks ?? [],
                    albums: data.albums ?? [],
                    artists: data.artists ?? [],
                    playlists: data.playlists ?? [],
                });
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search
        const timeoutId = setTimeout(fetchResults, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const listItems: ListItem[] = useMemo(() => {
        const users: ListItem[] = results.users.map((user) => ({
            id: `user-${user.id}`,
            name: user.displayName,
            subtitle: `@${user.handle}`,
            imageUrl: user.profileImageUrl,
            type: "user" as const,
        }));

        const tracks: ListItem[] = results.tracks.map((track) => ({
            id: `track-${track.id}`,
            name: track.name,
            subtitle: `${track.artistName || "Unknown Artist"} • ${formatDuration(track.durationMs)}`,
            imageUrl: track.albumImageUrl,
            type: "song" as const,
        }));

        const albums: ListItem[] = results.albums.map((album) => ({
            id: `album-${album.id}`,
            name: album.name,
            subtitle: `${album.albumType ?? "Album"}${album.totalTracks ? ` • ${album.totalTracks} tracks` : ""}`,
            imageUrl: album.imageUrl,
            type: "album" as const,
        }));

        const artists: ListItem[] = results.artists.map((artist) => ({
            id: `artist-${artist.id}`,
            name: artist.name,
            subtitle: "Artist",
            imageUrl: artist.imageUrl,
            type: "artist" as const,
        }));

        const playlists: ListItem[] = results.playlists.map((playlist) => ({
            id: `playlist-${playlist.id}`,
            name: playlist.name,
            subtitle: playlist.trackCount != null ? `${playlist.trackCount} tracks` : "Playlist",
            imageUrl: playlist.imageUrl,
            type: "playlist" as const,
        }));

        return [...users, ...tracks, ...albums, ...artists, ...playlists];
    }, [results]);

    const handleItemPress = (item: ListItem) => {
        if (item.type === "user") {
            const userId = item.id.replace("user-", "");
            router.push(`/profile/${userId}`);
        } else if (item.type === "song") {
            const track = results.tracks.find((t) => `track-${t.id}` === item.id);
            if (track) {
                router.push(`/song/${track.spotifyId}`);
            }
        } else if (item.type === "album") {
            const album = results.albums.find((a) => `album-${a.id}` === item.id);
            if (album) {
                router.push(`/album/${album.spotifyId}`);
            }
        } else if (item.type === "artist") {
            const artist = results.artists.find((a) => `artist-${a.id}` === item.id);
            if (artist) {
                router.push(`/artist/${artist.spotifyId}`);
            }
        } else if (item.type === "playlist") {
            const playlist = results.playlists.find((p) => `playlist-${p.id}` === item.id);
            if (playlist) {
                router.push(`/playlist/${playlist.spotifyId}`);
            }
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top + 140 }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    const hasResults = listItems.length > 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {!hasResults && query.trim() ? (
                <View style={styles.emptyContainer}>
                    <ThemedText style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        No results found for &ldquo;{query}&rdquo;
                    </ThemedText>
                </View>
            ) : (
                <TrackList
                    items={listItems}
                    onItemPress={handleItemPress}
                    showTypeBadge
                    emptyMessage=""
                    flatListProps={{
                        contentContainerStyle: styles.content,
                        onScrollBeginDrag: collapse,
                        ListHeaderComponent: hasResults ? (
                            <ThemedText type="subtitle" style={styles.sectionTitle}>
                                Results
                            </ThemedText>
                        ) : null,
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
    },
    sectionTitle: {
        marginBottom: 8,
    },
});
