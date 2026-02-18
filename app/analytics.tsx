import FilterBubble from "@/components/ui/filter-bubble";
import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import analyticsApi, {
    AnalyticsOverview,
    TopAlbum,
    TopArtist,
    TopTrack,
} from "@/services/analyticsApi";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TimeFrame = "7" | "30" | "90" | "0";

export default function AnalyticsScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const [timeFrame, setTimeFrame] = useState<TimeFrame>("7");
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
    const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
    const [topAlbums, setTopAlbums] = useState<TopAlbum[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const timeFrameOptions = [
        { label: "7 Days", value: "7" as TimeFrame },
        { label: "30 Days", value: "30" as TimeFrame },
        { label: "90 Days", value: "90" as TimeFrame },
        { label: "All Time", value: "0" as TimeFrame },
    ];

    const fetchData = useCallback(async () => {
        const days = parseInt(timeFrame);
        try {
            const [overviewData, tracksData, artistsData, albumsData] = await Promise.all([
                analyticsApi.getOverview(days),
                analyticsApi.getTopTracks(days, 5),
                analyticsApi.getTopArtists(days, 5),
                analyticsApi.getTopAlbums(days, 5),
            ]);
            setOverview(overviewData);
            setTopTracks(tracksData);
            setTopArtists(artistsData);
            setTopAlbums(albumsData);
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [timeFrame]);

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const hasNoData =
        topTracks.length === 0 &&
        topArtists.length === 0 &&
        topAlbums.length === 0;

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <ThemedText type="small" style={styles.loadingText}>Loading analytics...</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <ThemedText type="title">Analytics</ThemedText>
                        <ThemedText type="small" style={{ color: colors.icon }}>
                            Your listening insights
                        </ThemedText>
                    </View>
                </View>

                {/* Time Frame Selector */}
                <View style={styles.filterContainer}>
                    {timeFrameOptions.map((option) => (
                        <FilterBubble
                            key={option.value}
                            filterName={option.label}
                            activeFilter={
                                timeFrameOptions.find((o) => o.value === timeFrame)?.label || ""
                            }
                            setActiveFilter={(label) => {
                                const selected = timeFrameOptions.find((o) => o.label === label);
                                if (selected) setTimeFrame(selected.value);
                            }}
                        />
                    ))}
                </View>

                {/* Empty State */}
                {hasNoData && (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="bar-chart" size={48} color={colors.icon} />
                        <ThemedText type="defaultSemiBold" style={[styles.emptyStateTitle, { color: colors.icon }]}>
                            No analytics data yet
                        </ThemedText>
                        <ThemedText type="small" style={[styles.emptyStateSubtext, { color: colors.icon }]}>
                            Start listening to see your stats!
                        </ThemedText>
                    </View>
                )}

                {/* Overview Stats */}
                {overview && (
                    <View style={[styles.statsGrid, { backgroundColor: colors.card }]}>
                        <View style={styles.statCard}>
                            <MaterialIcons name="play-circle-filled" size={28} color={Colors.primary} />
                            <ThemedText type="subtitle" style={styles.statValue}>{overview.totalPlays}</ThemedText>
                            <ThemedText type="small" style={[styles.statLabel, { color: colors.icon }]}>
                                Total Plays
                            </ThemedText>
                        </View>
                        <View style={styles.statCard}>
                            <MaterialIcons name="access-time" size={28} color={Colors.primary} />
                            <ThemedText type="subtitle" style={styles.statValue}>
                                {Math.round(overview.totalMinutes)}
                            </ThemedText>
                            <ThemedText type="small" style={[styles.statLabel, { color: colors.icon }]}>
                                Minutes
                            </ThemedText>
                        </View>
                        <View style={styles.statCard}>
                            <MaterialIcons name="library-music" size={28} color={Colors.primary} />
                            <ThemedText type="subtitle" style={styles.statValue}>{overview.uniqueTracks}</ThemedText>
                            <ThemedText type="small" style={[styles.statLabel, { color: colors.icon }]}>
                                Unique Tracks
                            </ThemedText>
                        </View>
                    </View>
                )}

                {/* Top Tracks */}
                {topTracks.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="music-note" size={22} color={Colors.primary} />
                            <ThemedText type="subtitle">Top Tracks</ThemedText>
                        </View>
                        {topTracks.map((track, index) => (
                            <Pressable
                                key={track.id}
                                style={[styles.listItem, { backgroundColor: colors.card }]}
                                onPress={() => router.push(`/song/${track.spotifyId}` as any)}
                            >
                                <View style={[styles.rankBadge, { backgroundColor: Colors.primary + "20" }]}>
                                    <ThemedText type="small" style={[styles.rankText, { color: Colors.primary }]}>
                                        {index + 1}
                                    </ThemedText>
                                </View>
                                <Image
                                    source={{ uri: track.album?.image_url || "https://via.placeholder.com/52" }}
                                    style={styles.itemImage}
                                />
                                <View style={styles.itemInfo}>
                                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                                        {track.name}
                                    </ThemedText>
                                    <ThemedText type="small" style={{ color: colors.icon, marginTop: 3 }} numberOfLines={1}>
                                        {track.artists.join(", ")}
                                    </ThemedText>
                                </View>
                                <View style={styles.statsContainer}>
                                    <View style={styles.stat}>
                                        <MaterialIcons name="play-arrow" size={14} color={colors.icon} />
                                        <ThemedText type="small" style={{ color: colors.icon }}>
                                            {track.playCount}
                                        </ThemedText>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* Top Artists */}
                {topArtists.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="mic" size={22} color={Colors.primary} />
                            <ThemedText type="subtitle">Top Artists</ThemedText>
                        </View>
                        {topArtists.map((artist, index) => (
                            <Pressable
                                key={artist.id}
                                style={[styles.listItem, { backgroundColor: colors.card }]}
                                onPress={() => router.push(`/artist/${artist.spotifyId}` as any)}
                            >
                                <View style={[styles.rankBadge, { backgroundColor: Colors.primary + "20" }]}>
                                    <ThemedText type="small" style={[styles.rankText, { color: Colors.primary }]}>
                                        {index + 1}
                                    </ThemedText>
                                </View>
                                <Image
                                    source={{ uri: artist.imageUrl || "https://via.placeholder.com/52" }}
                                    style={[styles.itemImage, styles.artistImage]}
                                />
                                <View style={styles.itemInfo}>
                                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                                        {artist.name}
                                    </ThemedText>
                                </View>
                                <View style={styles.statsContainer}>
                                    <View style={styles.stat}>
                                        <MaterialIcons name="play-arrow" size={14} color={colors.icon} />
                                        <ThemedText type="small" style={{ color: colors.icon }}>
                                            {artist.playCount}
                                        </ThemedText>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* Top Albums */}
                {topAlbums.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="album" size={22} color={Colors.primary} />
                            <ThemedText type="subtitle">Top Albums</ThemedText>
                        </View>
                        {topAlbums.map((album, index) => (
                            <Pressable
                                key={album.id}
                                style={[styles.listItem, { backgroundColor: colors.card }]}
                                onPress={() => router.push(`/album/${album.spotifyId}` as any)}
                            >
                                <View style={[styles.rankBadge, { backgroundColor: Colors.primary + "20" }]}>
                                    <ThemedText type="small" style={[styles.rankText, { color: Colors.primary }]}>
                                        {index + 1}
                                    </ThemedText>
                                </View>
                                <Image
                                    source={{ uri: album.imageUrl || "https://via.placeholder.com/52" }}
                                    style={styles.itemImage}
                                />
                                <View style={styles.itemInfo}>
                                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                                        {album.name}
                                    </ThemedText>
                                </View>
                                <View style={styles.statsContainer}>
                                    <View style={styles.stat}>
                                        <MaterialIcons name="play-arrow" size={14} color={colors.icon} />
                                        <ThemedText type="small" style={{ color: colors.icon }}>
                                            {album.playCount}
                                        </ThemedText>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerContent: {
        flex: 1,
    },
    loadingText: {
        marginTop: 12,
    },
    filterContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    emptyState: {
        alignItems: "center",
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    emptyStateTitle: {
        marginTop: 16,
    },
    emptyStateSubtext: {
        textAlign: "center",
        marginTop: 8,
    },
    statsGrid: {
        flexDirection: "row",
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 14,
        gap: 12,
        marginBottom: 28,
    },
    statCard: {
        flex: 1,
        alignItems: "center",
    },
    statValue: {
        marginTop: 8,
    },
    statLabel: {
        marginTop: 4,
        textAlign: "center",
    },
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 14,
    },
    listItem: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 12,
        borderRadius: 14,
    },
    rankBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    rankText: {
        fontWeight: "bold",
    },
    itemImage: {
        width: 52,
        height: 52,
        borderRadius: 8,
    },
    artistImage: {
        borderRadius: 26,
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    statsContainer: {
        marginLeft: 8,
        alignItems: "flex-end",
    },
    stat: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
});
