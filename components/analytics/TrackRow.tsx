import React from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";

import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TopTrack, ActivityPoint } from "@/services/analyticsApi";
import MiniLineChart from "@/components/ui/MiniLineChart";

interface TrackRowProps {
    track: TopTrack;
    index: number;
    isExpanded: boolean;
    onPress: () => void;
    historyData: ActivityPoint[] | null;
    isLoadingHistory: boolean;
}

export const TrackRow = ({
    track,
    index,
    isExpanded,
    onPress,
    historyData,
    isLoadingHistory,
}: TrackRowProps) => {
    const { colors } = useColorScheme() === "dark"
        ? { colors: Colors.dark }
        : { colors: Colors.light };

    return (
        <Animated.View
            layout={Layout.springify()}
            entering={FadeInDown.delay(index * 100).springify()}
            style={[styles.trackRowCard, { backgroundColor: colors.card }]}
        >
            <Pressable onPress={onPress} style={styles.trackRowHeader}>
                <View style={[styles.rankBadge, { backgroundColor: Colors.primary + "20" }]}>
                    <ThemedText style={{ color: Colors.primary, fontWeight: "bold" }}>
                        #{index + 1}
                    </ThemedText>
                </View>

                <Image
                    source={{ uri: track.album?.image_url || "https://via.placeholder.com/60" }}
                    style={styles.trackImage}
                    contentFit="cover"
                />

                <View style={styles.trackInfo}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>{track.name}</ThemedText>
                    <ThemedText type="small" style={{ color: colors.icon }} numberOfLines={1}>
                        {track.artists.join(", ")}
                    </ThemedText>
                </View>

                <View style={styles.trackStats}>
                    <ThemedText type="defaultSemiBold">{track.playCount}</ThemedText>
                    <ThemedText type="small" style={{ fontSize: 10, color: colors.icon }}>plays</ThemedText>
                </View>

                <MaterialIcons
                    name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={24}
                    color={colors.icon}
                />
            </Pressable>

            {isExpanded && (
                <Animated.View
                    entering={FadeInDown.duration(300)}
                    style={styles.expandedContent}
                >
                    <View style={styles.divider} />
                    <ThemedText type="small" style={{ marginBottom: 10, color: colors.icon }}>
                        Listening History (Last 7 Days)
                    </ThemedText>

                    {isLoadingHistory ? (
                        <ActivityIndicator color={Colors.primary} style={{ margin: 20 }} />
                    ) : historyData ? (
                        <MiniLineChart
                            data={historyData}
                            height={140}
                            color={Colors.primary}
                        />
                    ) : (
                        <ThemedText>No history data available.</ThemedText>
                    )}
                </Animated.View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    trackRowCard: {
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    trackRowHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 12,
    },
    rankBadge: {
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    trackImage: {
        width: 48,
        height: 48,
        borderRadius: 8,
    },
    trackInfo: {
        flex: 1,
    },
    trackStats: {
        alignItems: "flex-end",
        marginRight: 8,
    },
    expandedContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(150,150,150, 0.1)",
        marginBottom: 16,
    },
});
