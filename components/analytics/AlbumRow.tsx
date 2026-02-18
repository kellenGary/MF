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
            style={[styles.albumRow]}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: album.imageUrl || "https://via.placeholder.com/60" }}
                    style={styles.albumCover}
                    contentFit="cover"
                    transition={200}
                />
                <View style={[styles.rankBadge, { backgroundColor: Colors.primary }]}>
                    <ThemedText style={{
                        color: "#FFF",
                        fontWeight: "bold",
                        fontSize: 10,
                        textAlign: 'center',
                        lineHeight: 12,
                        width: '100%',
                    }}>
                        #{index + 1}
                    </ThemedText>
                </View>
            </View>

            <View style={styles.albumInfo}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>{album.name}</ThemedText>
                <ThemedText type="small" style={{ color: colors.icon }} numberOfLines={1}>
                    {album.playCount} plays
                </ThemedText>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    albumRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        position: 'relative',
    },
    imageContainer: {
        position: 'relative',
        marginRight: 16,
    },
    albumCover: {
        width: 64,
        height: 64,
        borderRadius: 8,
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
    albumInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    albumStats: {
        alignItems: "flex-end",
        marginRight: 8,
    },
});
