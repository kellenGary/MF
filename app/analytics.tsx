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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import analyticsApi, {
    AnalyticsOverview,
    TopAlbum,
    TopArtist,
    TopTrack,
    ActivityPoint,
} from "@/services/analyticsApi";

import { StatCard } from "@/components/analytics/StatCard";
import { ArtistCard } from "@/components/analytics/ArtistCard";
import { AlbumRow } from "@/components/analytics/AlbumRow";
import { FilterPill } from "@/components/analytics/FilterPill";
import { TrackRow } from "@/components/analytics/TrackRow";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
    const [isLoading, setIsLoading] = useState(true);

    // Track Expansion State
    const [expandedTrackId, setExpandedTrackId] = useState<number | null>(null);
    const [trackHistory, setTrackHistory] = useState<Record<number, ActivityPoint[]>>({});
    const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const days = parseInt(timeFrame);
            const [ov, tracks, artists, albums] = await Promise.all([
                analyticsApi.getOverview(days),
                analyticsApi.getTopTracks(days, 5),
                analyticsApi.getTopArtists(days, 10),
                analyticsApi.getTopAlbums(days, 5),
            ]);
            setOverview(ov);
            setTopTracks(tracks);
            setTopArtists(artists);
            setTopAlbums(albums);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [timeFrame]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    if (isLoading && !overview) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    // Get full label for header
    const currentLabel = timeFrameOptions.find(o => o.value === timeFrame)?.fullLabel || "Overview";

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
                        <ThemedText type="title" style={{ fontSize: 34 }}>Analytics</ThemedText>
                        <ThemedText style={{ color: colors.icon }}>{currentLabel}</ThemedText>
                    </View>
                </Animated.View>

                {/* Custom Filter Pills */}
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

                {/* Overview Cards (Horizontal Scroll) */}
                {overview && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.statsScroll}
                    >
                        <StatCard
                            icon="play-circle-filled"
                            value={overview.totalPlays.toLocaleString()}
                            label="Plays"
                            color={Colors.primary}
                            delay={100}
                        />
                        <StatCard
                            icon="schedule"
                            value={Math.round(overview.totalMinutes).toLocaleString()}
                            label="Minutes"
                            color="#E54D2E" // Tomato/Orange
                            delay={200}
                        />
                        <StatCard
                            icon="library-music"
                            value={overview.uniqueTracks.toLocaleString()}
                            label="Tracks"
                            color="#46A758" // Green
                            delay={300}
                        />
                    </ScrollView>
                )}

                {/* Top Artists - Horizontal */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <ThemedText type="subtitle" style={styles.sectionTitle}>Top Artists</ThemedText>
                        <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.artistsScroll}
                    >
                        {topArtists.map((artist, i) => (
                            <ArtistCard key={artist.id} artist={artist} index={i} />
                        ))}
                    </ScrollView>
                </View>

                {/* Top Tracks List */}
                <View style={styles.sectionContainer}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Top Tracks</ThemedText>

                    {topTracks.map((track, i) => (
                        <TrackRow
                            key={track.id}
                            track={track}
                            index={i}
                            isExpanded={expandedTrackId === track.id}
                            onPress={() => handleTrackPress(track.id)}
                            historyData={trackHistory[track.id]}
                            isLoadingHistory={loadingHistoryId === track.id}
                        />
                    ))}
                </View>

                {/* Top Albums List */}
                <View style={styles.sectionContainer}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Top Albums</ThemedText>

                    {topAlbums.map((album, i) => (
                        <AlbumRow key={album.id} album={album} index={i} />
                    ))}
                </View>

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
    statsScroll: {
        paddingHorizontal: 20,
        gap: 12,
        paddingBottom: 20,
    },
    sectionContainer: {
        paddingHorizontal: 20,
        marginTop: 10,
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
});
