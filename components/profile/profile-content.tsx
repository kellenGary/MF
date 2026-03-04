import { ThemedText } from "@/components/ui/themed-text";
import TrackCarousel from "@/components/ui/track-carousel";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { FeedTrack } from "@/services/feedApi";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";

interface ProfileContentProps {
    loading: boolean;
    contentLoading: { tracks: boolean; albums: boolean; artists: boolean; playlists: boolean };
    recentTracks: FeedTrack[];
    likedTracks: FeedTrack[];
    likedAlbums: any[];
    playlists: any[];
    followedArtists: any[];
    isOwnProfile: boolean;
    spotifyId?: string;
    onLoadMoreLikedTracks?: () => void;
    onLoadMoreLikedAlbums?: () => void;
    onLoadMoreFollowedArtists?: () => void;
}

export default function ProfileContent({
    loading,
    contentLoading,
    recentTracks,
    likedTracks,
    likedAlbums,
    playlists,
    followedArtists,
    isOwnProfile,
    spotifyId,
    onLoadMoreLikedTracks,
    onLoadMoreLikedAlbums,
    onLoadMoreFollowedArtists,
}: ProfileContentProps) {
    const { colors } = useTheme();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    // Filter playlists to show only user's own playlists if viewing own profile
    const filteredPlaylists = playlists?.filter((playlist: any) =>
        isOwnProfile ? playlist.owner?.id === spotifyId : true
    ) || [];

    return (
        <View style={styles.container}>
            {/* Recent Tracks Section */}
            {recentTracks && recentTracks.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                            Recent Tracks
                        </ThemedText>
                    </View>
                    <View style={{ paddingHorizontal: 16 }}>
                        <TrackCarousel tracks={recentTracks} />
                    </View>
                </View>
            )}

            {/* Liked Tracks Section */}
            {likedTracks && likedTracks.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                            Liked Songs
                        </ThemedText>
                    </View>
                    <View style={{ paddingHorizontal: 16 }}>
                        <TrackCarousel tracks={likedTracks} onEndReached={onLoadMoreLikedTracks} />
                    </View>
                </View>
            )}

            {/* Liked Albums Section */}
            {likedAlbums && likedAlbums.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                            Liked Albums
                        </ThemedText>
                        <ThemedText style={[styles.sectionCount, { color: colors.text }]}>
                            {likedAlbums.length} albums
                        </ThemedText>
                    </View>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScrollContent}
                        data={likedAlbums}
                        keyExtractor={(item, index) => `album-${item.album?.id || item.id}-${index}`}
                        onEndReached={onLoadMoreLikedAlbums}
                        onEndReachedThreshold={0.5}
                        renderItem={({ item }) => {
                            const album = item.album || item;
                            return (
                                <Pressable
                                    style={styles.mediaCard}
                                    onPress={() => router.push(`/album/${album.id}`)}
                                >
                                    <Image
                                        source={{ uri: album.imageUrl || album.image_url }}
                                        style={[styles.mediaImage, { backgroundColor: colors.card }]}
                                    />
                                    <ThemedText
                                        style={[styles.mediaTitle, { color: colors.text }]}
                                        numberOfLines={1}
                                    >
                                        {album.name}
                                    </ThemedText>
                                    <ThemedText
                                        style={[styles.mediaSubtitle, { color: colors.text }]}
                                        numberOfLines={1}
                                    >
                                        {album.albumType || 'Album'}
                                    </ThemedText>
                                </Pressable>
                            );
                        }}
                    />
                </View>
            )}

            {/* Playlists Section */}
            {filteredPlaylists && filteredPlaylists.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                            Playlists
                        </ThemedText>
                        <ThemedText style={[styles.sectionCount, { color: colors.text }]}>
                            {filteredPlaylists.length} playlists
                        </ThemedText>
                    </View>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScrollContent}
                        data={filteredPlaylists}
                        keyExtractor={(playlist, index) => `playlist-${playlist.id}-${index}`}
                        renderItem={({ item: playlist }) => (
                            <Pressable
                                style={styles.mediaCard}
                                onPress={() => router.push(`/playlist/${playlist.id}`)}
                            >
                                <Image
                                    source={{ uri: playlist.images?.[0]?.url }}
                                    style={[styles.mediaImage, { backgroundColor: colors.card }]}
                                />
                                <ThemedText
                                    style={[styles.mediaTitle, { color: colors.text }]}
                                    numberOfLines={1}
                                >
                                    {playlist.name}
                                </ThemedText>
                                <ThemedText
                                    style={[styles.mediaSubtitle, { color: colors.text }]}
                                    numberOfLines={1}
                                >
                                    {playlist.tracks?.total || 0} songs
                                </ThemedText>
                            </Pressable>
                        )}
                    />
                </View>
            )}

            {/* Followed Artists Section */}
            {followedArtists && followedArtists.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                                Following
                            </ThemedText>
                            <ThemedText style={[styles.sectionCount, { color: colors.text }]}>
                                {followedArtists.length} artists
                            </ThemedText>
                        </View>
                        {followedArtists.length > 10 && (
                            <Pressable onPress={() => router.push({
                                pathname: "/profile/following",
                                params: { userId: isOwnProfile ? undefined : spotifyId }
                            })}>
                                <ThemedText style={{ color: Colors.primary, fontSize: 14, fontWeight: "600" }}>
                                    See all
                                </ThemedText>
                            </Pressable>
                        )}
                    </View>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScrollContent}
                        data={followedArtists}
                        keyExtractor={(item, index) => `artist-${item.artist?.id || item.id}-${index}`}
                        onEndReached={onLoadMoreFollowedArtists}
                        onEndReachedThreshold={0.5}
                        renderItem={({ item }) => {
                            const artist = item.artist || item;
                            return (
                                <Pressable
                                    style={styles.artistCard}
                                    onPress={() => router.push(`/artist/${artist.id}`)}
                                >
                                    <Image
                                        source={{ uri: artist.imageUrl || artist.image_url }}
                                        style={[styles.artistImage, { backgroundColor: colors.card }]}
                                    />
                                    <ThemedText
                                        style={[styles.mediaTitle, { color: colors.text }]}
                                        numberOfLines={1}
                                    >
                                        {artist.name}
                                    </ThemedText>
                                    <ThemedText
                                        style={[styles.mediaSubtitle, { color: colors.text }]}
                                        numberOfLines={1}
                                    >
                                        Artist
                                    </ThemedText>
                                </Pressable>
                            );
                        }}
                    />
                </View>
            )}

            {/* Bottom spacer for scroll padding */}
            <View style={styles.bottomSpacer} />

            {/* Empty state */}
            {!contentLoading.tracks &&
                recentTracks?.length === 0 &&
                likedTracks?.length === 0 &&
                likedAlbums?.length === 0 &&
                followedArtists?.length === 0 &&
                filteredPlaylists?.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <ThemedText style={[styles.emptyText, { color: colors.text }]}>
                            No content to display
                        </ThemedText>
                    </View>
                )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
    },
    sectionCount: {
        fontSize: 13,
        opacity: 0.5,
    },
    horizontalScrollContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    mediaCard: {
        width: 140,
        gap: 6,
    },
    mediaImage: {
        width: 140,
        height: 140,
        borderRadius: 8,
    },
    artistCard: {
        width: 120,
        alignItems: "center",
        gap: 6,
    },
    artistImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    mediaTitle: {
        fontSize: 14,
        fontWeight: "600",
    },
    mediaSubtitle: {
        fontSize: 12,
        opacity: 0.6,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    bottomSpacer: {
        height: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        opacity: 0.6,
    },
});
