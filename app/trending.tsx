import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    ScrollView,
    StyleSheet,
    LayoutAnimation,
    Platform,
    UIManager,
    ActivityIndicator,
    Pressable,
    RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import trendingApi, {
    TrendingAlbum,
    TrendingArtist,
    TrendingTrack,
} from "@/services/trendingApi";
import analyticsApi, { ActivityPoint } from "@/services/analyticsApi";

import { ArtistCard } from "@/components/analytics/ArtistCard";
import { AlbumRow } from "@/components/analytics/AlbumRow";
import { FilterPill } from "@/components/analytics/FilterPill";
import { TrackRow } from "@/components/analytics/TrackRow";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TimeFrame = "7" | "30" | "90" | "0";

export default function TrendingScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const [timeFrame, setTimeFrame] = useState<TimeFrame>("7");
    const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([]);
    const [trendingArtists, setTrendingArtists] = useState<TrendingArtist[]>([]);
    const [trendingAlbums, setTrendingAlbums] = useState<TrendingAlbum[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Track Expansion State
    const [expandedTrackId, setExpandedTrackId] = useState<number | null>(null);
    const [trackHistory, setTrackHistory] = useState<Record<number, ActivityPoint[]>>({});
    const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const days = parseInt(timeFrame);
            const [tracks, artists, albums] = await Promise.all([
                trendingApi.getTrendingTracks(10, days || 7),
                trendingApi.getTrendingArtists(10, days || 7),
                trendingApi.getTrendingAlbums(10, days || 7),
            ]);
            setTrendingTracks(tracks);
            setTrendingArtists(artists);
            setTrendingAlbums(albums);
        } catch (e) {
            console.error("Failed to fetch trending:", e);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [timeFrame]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleTrackPress = async (trackId: number) => {
        // Layout Animation for smooth expand/collapse
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        if (expandedTrackId === trackId) {
            setExpandedTrackId(null);
            return;
        }

        setExpandedTrackId(trackId);

        // Fetch history if not cached
        if (!trackHistory[trackId]) {
            setLoadingHistoryId(trackId);
            try {
                // We use analyticsApi.getTrackHistory here for the visual effect
                const history = await analyticsApi.getTrackHistory(trackId, parseInt(timeFrame) || 7);
                setTrackHistory(prev => ({ ...prev, [trackId]: history }));
            } catch (e) {
                console.error("Failed to load history", e);
            } finally {
                setLoadingHistoryId(null);
            }
        }
    };

    const timeFrameOptions = [
        { label: "7D", value: "7" as TimeFrame, fullLabel: "Last 7 Days" },
        { label: "30D", value: "30" as TimeFrame, fullLabel: "Last 30 Days" },
        { label: "90D", value: "90" as TimeFrame, fullLabel: "Last 3 Months" },
        { label: "All", value: "0" as TimeFrame, fullLabel: "All Time" },
    ];

    if (isLoading && trendingTracks.length === 0) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const currentLabel = timeFrameOptions.find(o => o.value === timeFrame)?.fullLabel || "Trending";

    const hasNoData =
        trendingTracks.length === 0 &&
        trendingArtists.length === 0 &&
        trendingAlbums.length === 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Background Gradient for Depth */}
            <LinearGradient
                colors={[Colors.primary + "10", "transparent"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 0.3 }}
            />

            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
                }
            >
                {/* Header */}
                <Animated.View
                    entering={FadeInDown.duration(600)}
                    style={[styles.header, { paddingTop: insets.top + 20 }]}
                >
                    <Pressable onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>
                    <View>
                        <ThemedText type="title" style={{ fontSize: 34 }}>Trending</ThemedText>
                        <ThemedText style={{ color: colors.icon }}>{currentLabel}</ThemedText>
                    </View>
                </Animated.View>

                {/* Filter Pills */}
                <View style={styles.filterRow}>
                    {timeFrameOptions.map((opt) => (
                        <FilterPill
                            key={opt.value}
                            label={opt.label}
                            isActive={timeFrame === opt.value}
                            onPress={() => setTimeFrame(opt.value)}
                        />
                    ))}
                </View>

                {hasNoData && !isLoading && (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="trending-up" size={48} color={colors.icon} />
                        <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
                            No trending data yet
                        </ThemedText>
                        <ThemedText style={[styles.emptySubtext, { color: colors.icon }]}>
                            Start listening to contribute to the trends!
                        </ThemedText>
                    </View>
                )}

                {/* Top Artists - Horizontal */}
                {trendingArtists.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <ThemedText type="subtitle" style={styles.sectionTitle}>Popular Artists</ThemedText>
                            <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.artistsScroll}
                        >
                            {trendingArtists.map((artist, i) => (
                                <ArtistCard key={artist.id} artist={artist as any} index={i} />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Top Tracks List */}
                {trendingTracks.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <ThemedText type="subtitle" style={styles.sectionTitle}>Hot Tracks</ThemedText>

                        {trendingTracks.map((track, i) => (
                            <TrackRow
                                key={track.id}
                                track={track as any}
                                index={i}
                                isExpanded={expandedTrackId === track.id}
                                onPress={() => handleTrackPress(track.id)}
                                historyData={trackHistory[track.id]}
                                isLoadingHistory={loadingHistoryId === track.id}
                            />
                        ))}
                    </View>
                )}

                {/* Top Albums List */}
                {trendingAlbums.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <ThemedText type="subtitle" style={styles.sectionTitle}>Top Albums</ThemedText>

                        {trendingAlbums.map((album, i) => (
                            <AlbumRow key={album.id} album={album as any} index={i} />
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
    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    backBtn: {
        padding: 8,
        borderRadius: 50,
        backgroundColor: "rgba(0,0,0,0.05)",
    },
    filterRow: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 24,
    },
    sectionContainer: {
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        marginBottom: 16,
        fontSize: 20,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingRight: 10,
    },
    artistsScroll: {
        paddingBottom: 10,
        gap: 12,
    },
    emptyState: {
        alignItems: "center",
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: "center",
        marginTop: 8,
    },
});
