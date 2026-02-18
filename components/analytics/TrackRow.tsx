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
            style={[styles.trackRowCard]}
        >
            <Pressable onPress={onPress} style={styles.trackRowHeader}>
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: track.album?.image_url || "https://via.placeholder.com/60" }}
                        style={styles.trackImage}
                        contentFit="cover"
                    />
                    <View style={[styles.rankBadge, { backgroundColor: Colors.primary }]}>
                        <ThemedText style={{
                            color: "#FFF",
                            fontWeight: "bold",
                            fontSize: 10,
                            textAlign: 'center',
                            lineHeight: 12,
                            width: '100%',
                            includeFontPadding: false,
                        }}>
                            #{index + 1}
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.trackInfo}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>{track.name}</ThemedText>
                    <ThemedText type="small" style={{ color: colors.icon }} numberOfLines={1}>
                        {track.artists.join(", ")}
                    </ThemedText>
                </View>

                <View style={styles.trackStats}>
                    <ThemedText type="defaultSemiBold">{track.totalStreams}</ThemedText>
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
                    style={[styles.expandedContent, { borderColor: colors.border }]}
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
        paddingVertical: 8,
        paddingHorizontal: 8,
        gap: 12,
        position: "relative",
    },
    rankBadge: {
        position: "absolute",
        top: -6,
        left: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
        borderWidth: 2,
        borderColor: "#1E1E1E",
    },
    imageContainer: {
        position: 'relative',
        marginRight: 4,
    },
    trackImage: {
        width: 64,
        height: 64,
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
        paddingHorizontal: 8,
        paddingBottom: 20,
    },
    divider: {
        height: 1,
        marginBottom: 16,
    },
});
