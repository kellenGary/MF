import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/contexts/ThemeContext";
import profileApi, { ProfileData } from "@/services/profileApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import FollowButton from "../ui/follow-button";
import SOTDProfile from "./sotd-profile";

interface ProfileHeaderProps {
    profileData: ProfileData | null;
    isOwnProfile: boolean;
    sotd: any;
    userId?: number;
    onFollowChange: (isFollowing: boolean) => void;
}

export default function ProfileHeader({
    profileData,
    isOwnProfile,
    sotd,
    userId,
    onFollowChange,
}: ProfileHeaderProps) {
    const { colors } = useTheme();

    const [currentPlayback, setCurrentPlayback] = useState<{ isPlaying: boolean; track?: { id: string; name: string; uri: string; } } | null>(null);

    useEffect(() => {
        if (profileData && profileData.isSessionJoinable) {
            const uid = userId || profileData.id;
            if (uid) {
                profileApi.getCurrentPlayback(uid).then(res => {
                    setCurrentPlayback(res);
                }).catch(err => {
                    console.error("Failed to fetch current playback in header:", err);
                });
            }
        } else {
            setCurrentPlayback(null);
        }
    }, [profileData, userId]);

    return (
        <>
            {/* Header Actions */}
            <View style={styles.headerActions}>
                {/* Back button for other users' profiles */}
                {!isOwnProfile && (
                    <Pressable style={styles.backButton} onPress={() => router.back()}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.icon} />
                    </Pressable>
                )}
                {/* Settings button only for own profile */}
                {isOwnProfile ? (
                    <>
                        <Pressable
                            style={[styles.mapButton, { backgroundColor: colors.card }]}
                            onPress={() => router.push("/listening-map")}
                        >
                            <MaterialIcons name="map" size={24} color={colors.icon} />
                        </Pressable>
                        <Pressable
                            style={[styles.settingsButton, { backgroundColor: colors.card }]}
                            onPress={() => router.push("/(settings)")}
                        >
                            <MaterialIcons name="settings" size={24} color={colors.icon} />
                        </Pressable>
                    </>
                ) : (
                    <View style={styles.spacer} />
                )}
            </View>

            {/* Profile Picture */}
            <View style={styles.profileCenter}>
                <SOTDProfile track={sotd || null} isOwnProfile={isOwnProfile} />
                <View style={styles.profileImageContainer}>
                    <Image
                        source={{ uri: profileData ? profileData.profileImageUrl : "" }}
                        style={styles.profileImage}
                    />
                </View>

                {/* Name & Username */}
                <ThemedText type="subtitle" style={styles.profileName}>
                    {profileData ? profileData.displayName : "Unknown"}
                </ThemedText>
                <ThemedText>
                    {profileData ? "@" + profileData.handle : "unknown"}
                </ThemedText>

                {/* Now Listening Indicator */}
                {currentPlayback?.isPlaying && currentPlayback.track && (
                    <Pressable
                        style={[styles.nowListeningPill, { backgroundColor: "rgba(29, 185, 84, 0.15)" }]}
                        onPress={() => Linking.openURL(currentPlayback.track!.uri)}
                    >
                        <MaterialIcons name="headphones" size={16} color="#1DB954" style={styles.nowListeningIcon} />
                        <ThemedText style={styles.nowListeningText} numberOfLines={1}>
                            Listening to <ThemedText style={styles.nowListeningTrack}>{currentPlayback.track.name}</ThemedText>
                        </ThemedText>
                    </Pressable>
                )}

                {/* Follow Button for other users' profiles */}
                {!isOwnProfile && userId && (
                    <FollowButton userId={userId} onFollowChange={onFollowChange} />
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    headerActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 16,
    },
    spacer: {
        width: 40,
    },
    mapButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    profileCenter: {
        alignItems: "center",
    },
    profileImageContainer: {
        marginTop: 8,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 16,
    },
    profileName: {
        marginBottom: 4,
    },
    nowListeningPill: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
        marginBottom: 4,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        maxWidth: '80%',
    },
    nowListeningIcon: {
        marginRight: 6,
    },
    nowListeningText: {
        fontSize: 13,
        color: "#1DB954",
        fontWeight: "500",
    },
    nowListeningTrack: {
        fontWeight: "bold",
        color: "#1DB954",
    },
});
