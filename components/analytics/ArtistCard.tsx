import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInRight } from "react-native-reanimated";

import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { TopArtist } from "@/services/analyticsApi";

interface ArtistCardProps {
    artist: TopArtist;
    index: number;
}

export const ArtistCard = ({ artist, index }: ArtistCardProps) => {
    const { colors } = useColorScheme() === "dark"
        ? { colors: Colors.dark }
        : { colors: Colors.light };

    return (
        <Animated.View
            entering={FadeInRight.delay(index * 100).springify()}
            style={[styles.artistCard]}
        >
            <LinearGradient
                colors={[colors.card, colors.text + "08"]}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.artistImageContainer}>
                    {artist.imageUrl ? (
                        <Image
                            source={{ uri: artist.imageUrl }}
                            style={styles.artistImage}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : (
                        <View style={[styles.artistImagePlaceholder, { backgroundColor: Colors.primary + "40" }]}>
                            <ThemedText style={{ fontSize: 32, fontWeight: 'bold', color: Colors.primary }}>
                                {artist.name[0]}
                            </ThemedText>
                        </View>
                    )}
                    {/* Rank Badge */}
                    <View style={[styles.rankBadgeFloating, { backgroundColor: Colors.primary }]}>
                        <ThemedText style={{ color: "#FFF", fontSize: 10, fontWeight: "bold" }}>#{index + 1}</ThemedText>
                    </View>
                </View>

                <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.artistName}>
                    {artist.name}
                </ThemedText>
            </LinearGradient>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    artistCard: {
        width: 140,
        borderRadius: 20,
        marginRight: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    cardGradient: {
        padding: 16,
        alignItems: 'center',
        width: '100%',
        borderRadius: 20,
    },
    artistImageContainer: {
        marginBottom: 12,
        position: 'relative',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    artistImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.1)",
    },
    artistImagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    artistName: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 4,
    },
    rankBadgeFloating: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1E1E1E',
    },
});
