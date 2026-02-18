import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TopAlbum } from "@/services/analyticsApi";

interface AlbumRowProps {
    album: TopAlbum;
    index: number;
}

export const AlbumRow = ({ album, index }: AlbumRowProps) => {
    const { colors } = useColorScheme() === "dark"
        ? { colors: Colors.dark }
        : { colors: Colors.light };

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100 + 200).springify()}
            style={[styles.albumRow, { backgroundColor: colors.card }]}
        >
            <Image
                source={{ uri: album.imageUrl || "https://via.placeholder.com/60" }}
                style={styles.albumCover}
                contentFit="cover"
                transition={200}
            />
            <View style={styles.albumInfo}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>{album.name}</ThemedText>
                <ThemedText type="small" style={{ color: colors.icon }}>{album.playCount} plays</ThemedText>
            </View>
            <View style={[styles.rankBadgeSmall, { backgroundColor: Colors.primary + "20" }]}>
                <ThemedText style={{ color: Colors.primary, fontSize: 12, fontWeight: "bold" }}>#{index + 1}</ThemedText>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    albumRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    albumCover: {
        width: 56,
        height: 56,
        borderRadius: 12,
        marginRight: 16,
        backgroundColor: '#2A2A2A',
    },
    albumInfo: {
        flex: 1,
    },
    rankBadgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
});
