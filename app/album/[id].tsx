import LikeButton from "@/components/ui/like-button";
import BlurBackButton from "@/components/ui/blur-back-button";
import { ThemedText } from '@/components/ui/themed-text';
import ErrorScreen from "@/components/ui/error-screen";
import LoadingScreen from "@/components/ui/loading-screen";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import playbackApi from "@/services/playbackApi";
import spotifyApi from "@/services/spotifyApi";
import { MaterialIcons } from "@expo/vector-icons";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ALBUM_COVER_SIZE = 180;
const FAN_AVATAR_SIZE = 36;

interface AlbumFan {
  id: number;
  displayName: string | null;
  handle: string | null;
  profileImageUrl: string | null;
  isFollowing: boolean;
}

export default function AlbumScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tracks, setTracks] = useState<any[]>([]);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [fans, setFans] = useState<AlbumFan[]>([]);
  const [fansLoading, setFansLoading] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  useEffect(() => {
    if (!id) return;

    async function fetchAlbum() {
      setLoading(true);
      try {
        const fetchedAlbum = await spotifyApi.getAlbumWithTracks(id as string);
        setAlbum(fetchedAlbum);
        setTracks(fetchedAlbum.tracks?.items || []);
      } catch (error) {
        console.error("[AlbumScreen] Error fetching album:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAlbum();
  }, [id]);

  // Check if album is saved
  useEffect(() => {
    if (!id) return;
    async function checkSaved() {
      try {
        const isSaved = await spotifyApi.checkIfAlbumIsSaved(id as string);
        setSaved(isSaved);
      } catch (error) {
        console.error("Error checking saved state:", error);
        setSaved(false);
      }
    }
    checkSaved();
  }, [id]);

  // Fetch fans (friends who saved this album)
  useEffect(() => {
    if (!id) return;
    async function fetchFans() {
      setFansLoading(true);
      try {
        const response = await api.makeAuthenticatedRequest(
          `/api/albums/spotify/${id}/fans?limit=8`,
        );
        if (response.ok) {
          const data = await response.json();
          setFans(data.fans || []);
        }
      } catch (error) {
        console.error("Error fetching album fans:", error);
      } finally {
        setFansLoading(false);
      }
    }
    fetchFans();
  }, [id]);

  // Calculate total duration
  const totalDuration = tracks.reduce((acc, track) => {
    return acc + (track?.duration_ms || 0);
  }, 0);

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes} min`;
  };

  const handleToggleSave = useCallback(async () => {
    if (!id || saved === null || saveLoading) return;

    setSaveLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (saved) {
        await spotifyApi.unsaveAlbum(id as string);
        setSaved(false);
      } else {
        await spotifyApi.saveAlbum(id as string);
        setSaved(true);
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      Alert.alert("Error", "Failed to update library. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  }, [id, saved, saveLoading]);

  const handlePlayAlbum = useCallback(() => {
    if (!album?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playbackApi.playAlbum(album.id);
  }, [album?.id]);

  const handlePlayTrack = useCallback((spotifyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playbackApi.playSong(spotifyId);
  }, []);

  const handleShareToFeed = useCallback(async () => {
    if (!album || sharing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSharing(true);

    try {
      router.push({
        pathname: "/post-preview",
        params: {
          type: "album",
          id: album.id,
          spotifyId: album.id,
          name: album.name,
          imageUrl: album.images?.[0]?.url || "",
          subtitle: album.artists?.map((a: any) => a.name).join(", ") || "",
        },
      });
    } catch (error) {
      console.error("Error navigating to share:", error);
      Alert.alert("Error", "Failed to open share dialog.");
    } finally {
      setSharing(false);
    }
  }, [album, sharing]);

  const handleShuffle = useCallback(() => {
    if (!album?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playbackApi.shuffleAlbum(album.id);
  }, [album?.id]);

  // Count friends (those the user follows)
  const friendCount = fans.filter((f) => f.isFollowing).length;

  if (loading) {
    return <LoadingScreen message="Loading album..." />;
  }

  if (!album) {
    return <ErrorScreen icon="disc-outline" message="Album not found" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Back Button */}
      <BlurBackButton />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: insets.top }}
        showsVerticalScrollIndicator={false}
      >
        {/* Album Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: album.images?.[0]?.url || "" }}
            style={styles.albumCover}
            contentFit="cover"
            transition={300}
          />
          <ThemedText
            style={[styles.albumName, { color: colors.text }]}
            numberOfLines={2}
          >
            {album.name}
          </ThemedText>
          <ThemedText
            style={[styles.artistName, { color: colors.icon }]}
            numberOfLines={1}
          >
            {album.artists?.[0].name || "Unknown Artist"}
          </ThemedText>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="musical-notes" size={16} color={colors.icon} />
              <ThemedText style={[styles.statText, { color: colors.icon }]}>
                {tracks.length} tracks
              </ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={colors.icon} />
              <ThemedText style={[styles.statText, { color: colors.icon }]}>
                {formatDuration(totalDuration)}
              </ThemedText>
            </View>
            {album.release_date && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="calendar-outline" size={16} color={colors.icon} />
                  <ThemedText style={[styles.statText, { color: colors.icon }]}>
                    {new Date(album.release_date).getFullYear()}
                  </ThemedText>
                </View>
              </>
            )}
          </View>

          {/* Play Button */}
          <Pressable
            style={[styles.playButton, { backgroundColor: Colors.primary }]}
            onPress={handlePlayAlbum}
          >
            <MaterialIcons name="play-arrow" size={22} color="#fff" />
            <ThemedText style={styles.playButtonText}>Play</ThemedText>
          </Pressable>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <View style={styles.actionsRow}>
            {/* Save/Like Button */}
            <LikeButton
              liked={saved}
              likeLoading={saveLoading}
              handleToggleLike={handleToggleSave}
            />

            {/* Share Button */}
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={handleShareToFeed}
              disabled={sharing}
            >
              <MaterialIcons name="share" size={18} color={colors.text} />
              <ThemedText style={[styles.actionText, { color: colors.text }]}>
                Share
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Friends Who Saved Section */}
        {(fans.length > 0 || fansLoading) && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              {friendCount > 0
                ? `${friendCount} friend${friendCount > 1 ? "s" : ""} saved this`
                : "People who saved this"}
            </ThemedText>
            {fansLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View style={styles.fansContainer}>
                <View style={styles.fansAvatarRow}>
                  {fans.slice(0, 6).map((fan, index) => (
                    <Pressable
                      key={fan.id}
                      style={[
                        styles.fanAvatarWrapper,
                        { marginLeft: index > 0 ? -10 : 0, zIndex: fans.length - index },
                      ]}
                      onPress={() => router.push(`/profile/${fan.id}` as any)}
                    >
                      {fan.profileImageUrl ? (
                        <Image
                          source={{ uri: fan.profileImageUrl }}
                          style={[
                            styles.fanAvatar,
                            {
                              borderColor: colors.background,
                              borderWidth: 2,
                            },
                          ]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.fanAvatar,
                            styles.fanAvatarPlaceholder,
                            {
                              borderColor: colors.background,
                              borderWidth: 2,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.08)",
                            },
                          ]}
                        >
                          <MaterialIcons
                            name="person"
                            size={18}
                            color={colors.icon}
                          />
                        </View>
                      )}
                      {fan.isFollowing && (
                        <View style={[styles.followingDot, { borderColor: colors.background }]} />
                      )}
                    </Pressable>
                  ))}
                  {fans.length > 6 && (
                    <View
                      style={[
                        styles.fanAvatarWrapper,
                        { marginLeft: -10, zIndex: 0 },
                      ]}
                    >
                      <View
                        style={[
                          styles.fanAvatar,
                          styles.fanAvatarPlaceholder,
                          {
                            borderColor: colors.background,
                            borderWidth: 2,
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.15)"
                              : "rgba(0,0,0,0.1)",
                          },
                        ]}
                      >
                        <ThemedText
                          style={[styles.moreCount, { color: colors.text }]}
                        >
                          +{fans.length - 6}
                        </ThemedText>
                      </View>
                    </View>
                  )}
                </View>
                {fans.length > 0 && (
                  <ThemedText
                    style={[styles.fansNames, { color: colors.icon }]}
                    numberOfLines={1}
                  >
                    {fans
                      .slice(0, 3)
                      .map((f) => f.displayName || f.handle || "User")
                      .join(", ")}
                    {fans.length > 3 && ` and ${fans.length - 3} more`}
                  </ThemedText>
                )}
              </View>
            )}
          </View>
        )}

        {/* Track List Section */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Tracks
          </ThemedText>
          <View style={[styles.trackList, { backgroundColor: colors.card }]}>
            {tracks.map((track, index) => (
              <Pressable
                key={`${track?.trackId || track?.id || index}-${index}`}
                style={styles.trackItem}
                onPress={() =>
                  router.push(`/song/${track?.trackId}` as any)
                }
              >
                <ThemedText style={[styles.trackIndex, { color: colors.icon }]}>
                  {index + 1}
                </ThemedText>
                <View style={styles.trackInfo}>
                  <ThemedText
                    style={[styles.trackName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {track?.name || "Unknown Track"}
                  </ThemedText>
                  <ThemedText
                    style={[styles.trackArtist, { color: colors.icon }]}
                    numberOfLines={1}
                  >
                    {track?.artists?.map((artist: any) => artist.name).join(", ") ||
                      "Unknown Artist"}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.trackDuration, { color: colors.icon }]}>
                  {formatTrackDuration(track?.duration_ms)}
                </ThemedText>
                <Pressable
                  style={styles.trackPlayButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handlePlayTrack(track?.id);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name="play-circle-filled"
                    size={28}
                    color={Colors.primary}
                  />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function formatTrackDuration(ms: number | undefined): string {
  if (!ms) return "--:--";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 48,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  albumCover: {
    width: ALBUM_COVER_SIZE,
    height: ALBUM_COVER_SIZE,
    borderRadius: 8,
    marginBottom: 16,
  },
  albumName: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  artistName: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: "500",
  },
  statDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  playButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  // Fans / friends section
  fansContainer: {
    gap: 8,
  },
  fansAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fanAvatarWrapper: {
    position: "relative",
  },
  fanAvatar: {
    width: FAN_AVATAR_SIZE,
    height: FAN_AVATAR_SIZE,
    borderRadius: FAN_AVATAR_SIZE / 2,
  },
  fanAvatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  followingDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1DB954",
    borderWidth: 2,
  },
  moreCount: {
    fontSize: 11,
    fontWeight: "700",
  },
  fansNames: {
    fontSize: 13,
    marginTop: 2,
  },
  // Track list
  trackList: {
    borderRadius: 12,
    overflow: "hidden",
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  trackIndex: {
    width: 20,
    fontSize: 14,
    textAlign: "center",
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  trackName: {
    fontSize: 15,
    fontWeight: "500",
  },
  trackArtist: {
    fontSize: 13,
  },
  trackDuration: {
    fontSize: 13,
    marginRight: 4,
  },
  trackPlayButton: {
    padding: 4,
  },
});
