import BlurBackButton from "@/components/ui/blur-back-button";
import LikeButton from "@/components/ui/like-button";
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import playbackApi from "@/services/playbackApi";
import spotifyApi from "@/services/spotifyApi";
import { MaterialIcons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { RelativePathString, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HEADER_IMAGE_SIZE = SCREEN_WIDTH * 0.55;

export default function PlaylistScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tracks, setTracks] = useState<any[]>([]);
  const [sharing, setSharing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const [isNormalView, setIsNormalView] = useState(true);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);

  // Navigate to share screen
  const handleShareToFeed = useCallback(() => {
    if (!playlist || sharing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSharing(true);
    try {
      router.push({
        pathname: "/post-preview",
        params: {
          type: "playlist",
          id: id as string,
          spotifyId: playlist.id,
          name: playlist.name,
          imageUrl: playlist.images[0]?.url || "",
          subtitle: `${tracks.length} tracks`,
        },
      });
    } catch (error) {
      console.error("Error navigating to share:", error);
    } finally {
      setSharing(false);
    }
  }, [playlist, sharing, id, tracks.length]);

  const handlePlayPlaylist = useCallback(() => {
    if (!playlist?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playbackApi.playPlaylist(playlist.id);
  }, [playlist?.id]);

  const handleShuffle = useCallback(() => {
    if (!playlist?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playbackApi.shufflePlaylist(playlist.id);
  }, [playlist?.id]);

  const handlePlayTrack = useCallback((spotifyId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playbackApi.playSong(spotifyId);
  }, []);

  // Animation refs for throwing effect
  const throwAnim = useRef(new Animated.Value(0)).current;
  const animatedIndex = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeVector, setSwipeVector] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Animate the index changes for smooth card transitions
  useEffect(() => {
    if (!isAnimating) {
      Animated.spring(animatedIndex, {
        toValue: selectedTrackIndex,
        useNativeDriver: true,
        tension: 100,
        friction: 12,
      }).start();
    }
  }, [selectedTrackIndex, isAnimating]);

  const animateThrow = (
    direction: "next" | "prev",
    swipeX: number,
    swipeY: number,
    callback: () => void,
  ) => {
    setIsAnimating(true);
    // Normalize and amplify the swipe vector
    const magnitude = Math.sqrt(swipeX * swipeX + swipeY * swipeY) || 1;
    setSwipeVector({
      x: (swipeX / magnitude) * 400,
      y: (swipeY / magnitude) * 400,
    });

    const targetIndex = selectedTrackIndex + (direction === "next" ? 1 : -1);

    Animated.parallel([
      Animated.timing(throwAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(animatedIndex, {
        toValue: targetIndex,
        useNativeDriver: true,
        tension: 100,
        friction: 12,
      }),
    ]).start(() => {
      callback();
      throwAnim.setValue(0);
      setIsAnimating(false);
      setSwipeVector({ x: 0, y: 0 });
    });
  };

  useEffect(() => {
    if (!id) return;

    async function fetchPlaylist() {
      setLoading(true);
      try {
        const fetchedPlaylist = await spotifyApi.getPlaylistSongs(id as string);
        setPlaylist(fetchedPlaylist);
        setTracks(fetchedPlaylist.tracks.items);
      } catch (error) {
        console.error("Error fetching playlist:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylist();
  }, [id]);

  // Calculate total duration
  const totalDuration = tracks.reduce((acc, item) => {
    return acc + (item.track?.duration_ms || 0);
  }, 0);
  const totalMinutes = Math.floor(totalDuration / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Loading state
  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <ThemedText style={[styles.loadingText, { color: colors.text }]}>
            Loading playlist...
          </ThemedText>
        </View>
      </View>
    );
  }

  // Playlist not found
  if (!playlist) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <Ionicons name="musical-notes-outline" size={64} color={colors.icon} />
        <ThemedText style={[styles.errorText, { color: colors.text }]}>
          Playlist not found
        </ThemedText>
        <Pressable
          style={[styles.backButton, { backgroundColor: Colors.primary }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </Pressable>
      </View>
    );
  }

  const selectedTrack = tracks[selectedTrackIndex]?.track;

  return (
    <>
      {isNormalView ? (
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          {/* Floating buttons outside ScrollView - matches album pattern */}
          <BlurBackButton />
          <Pressable
            onPress={() => setIsNormalView(false)}
            style={({ pressed }) => [
              styles.floatingViewToggle,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={styles.blurButton}
            >
              <Ionicons
                name="albums-outline"
                size={20}
                color={colors.text}
              />
            </BlurView>
          </Pressable>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: insets.top }}
          >
            {/* Hero Section */}
            <View style={styles.heroSection}>
              {/* Playlist Cover */}
              <View style={styles.coverContainer}>
                <Image
                  source={{ uri: playlist.images[0]?.url || "" }}
                  style={styles.playlistCover}
                  contentFit="cover"
                  transition={300}
                />
                <View
                  style={[
                    styles.coverShadow,
                    { shadowColor: isDark ? "#000" : "#667eea" },
                  ]}
                />
              </View>

              {/* Playlist Info */}
              <View style={styles.playlistInfo}>
                <ThemedText
                  style={[styles.playlistName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {playlist.name}
                </ThemedText>

                {playlist.description && (
                  <ThemedText
                    style={[
                      styles.playlistDescription,
                      {
                        color: colors.text,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {playlist.description.replace(/<[^>]*>/g, "")}
                  </ThemedText>
                )}

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="musical-notes"
                      size={16}
                      color={colors.text}
                    />
                    <ThemedText
                      style={[
                        styles.statText,
                        {
                          color: colors.text,
                        },
                      ]}
                    >
                      {tracks.length} tracks
                    </ThemedText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={colors.text}
                    />
                    <ThemedText
                      style={[
                        styles.statText,
                        {
                          color: colors.text,
                        },
                      ]}
                    >
                      {totalHours > 0
                        ? `${totalHours}h ${remainingMinutes}m`
                        : `${remainingMinutes} min`}
                    </ThemedText>
                  </View>
                </View>

                {/* Play Button */}
                <Pressable
                  style={[styles.playButton, { backgroundColor: Colors.primary }]}
                  onPress={handlePlayPlaylist}
                >
                  <MaterialIcons name="play-arrow" size={22} color="#fff" />
                  <ThemedText style={styles.playButtonText}>Play</ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.section}>
              <View style={styles.actionsRow}>
                {/* Shuffle Button */}
                <Pressable
                  style={[styles.actionButton, { backgroundColor: colors.card }]}
                  onPress={handleShuffle}
                >
                  <MaterialIcons name="shuffle" size={18} color={colors.text} />
                  <ThemedText style={[styles.actionText, { color: colors.text }]}>
                    Shuffle
                  </ThemedText>
                </Pressable>

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

            {/* Track List Section */}
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                Tracks
              </ThemedText>
              <View style={[styles.trackList, { backgroundColor: colors.card }]}>
                {tracks.map((item, index) => (
                  <Pressable
                    key={`${item.track?.trackId || item.track?.id || index}-${index}`}
                    style={styles.trackItem}
                    onPress={() =>
                      router.push(`/song/${item.track?.trackId}` as RelativePathString)
                    }
                  >
                    <Image
                      source={{ uri: item.track?.album?.images?.[0]?.url || "" }}
                      style={styles.trackCover}
                      contentFit="cover"
                    />
                    <View style={styles.trackInfo}>
                      <ThemedText
                        style={[styles.trackName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.track?.name || "Unknown Track"}
                      </ThemedText>
                      <ThemedText
                        style={[styles.trackArtist, { color: colors.icon }]}
                        numberOfLines={1}
                      >
                        {item.track?.artists
                          ?.map((artist: any) => artist.name)
                          .join(", ") || "Unknown Artist"}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.trackDuration, { color: colors.icon }]}>
                      {formatTrackDuration(item.track?.duration_ms)}
                    </ThemedText>
                    <Pressable
                      style={styles.trackPlayButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handlePlayTrack(item.track?.id);
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
      ) : (
        /* Carousel View - Horizontal Scrolling Tracks */
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          {/* Compact Header Row */}
          <View style={[styles.carouselHeader, { paddingTop: insets.top + 10 }]}>
            {/* Back Button */}
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.carouselBackButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Entypo name="chevron-left" size={24} color={colors.text} />
            </Pressable>

            {/* Playlist Info Row */}
            <View style={styles.compactPlaylistInfo}>
              <Image
                source={{ uri: playlist.images[0]?.url || "" }}
                style={styles.compactCover}
                contentFit="cover"
              />
              <View style={styles.compactDetails}>
                <ThemedText
                  style={[styles.compactName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {playlist.name}
                </ThemedText>
                <ThemedText style={[styles.compactStats, { color: colors.icon }]}>
                  {tracks.length} tracks •{" "}
                  {totalHours > 0
                    ? `${totalHours}h ${remainingMinutes}m`
                    : `${remainingMinutes} min`}
                </ThemedText>
              </View>
            </View>

            {/* View Toggle Button */}
            <Pressable
              onPress={() => setIsNormalView(true)}
              style={({ pressed }) => [
                styles.carouselViewToggle,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="list-outline" size={22} color={colors.text} />
            </Pressable>
          </View>

          {/* Stacked Records View */}
          <GestureHandlerRootView style={styles.stackContainer}>
            <PanGestureHandler
              onHandlerStateChange={({ nativeEvent }) => {
                if (nativeEvent.state === State.END && !isAnimating) {
                  const { translationX, translationY, velocityX, velocityY } =
                    nativeEvent;
                  const distance = Math.sqrt(
                    translationX * translationX + translationY * translationY,
                  );
                  const velocity = Math.sqrt(
                    velocityX * velocityX + velocityY * velocityY,
                  );

                  // Determine if it's a valid swipe
                  if (distance > 50 || velocity > 500) {
                    // Use the dominant direction to determine next/prev
                    // Swipe left or up = next, swipe right or down = prev
                    const isNextSwipe =
                      translationX < -30 || translationY < -30;
                    const isPrevSwipe = translationX > 30 || translationY > 30;

                    if (isNextSwipe && selectedTrackIndex < tracks.length - 1) {
                      animateThrow("next", translationX, translationY, () => {
                        setSelectedTrackIndex((prev) =>
                          Math.min(tracks.length - 1, prev + 1),
                        );
                      });
                    } else if (isPrevSwipe && selectedTrackIndex > 0) {
                      animateThrow("prev", translationX, translationY, () => {
                        setSelectedTrackIndex((prev) => Math.max(0, prev - 1));
                      });
                    }
                  }
                }
              }}
            >
              <Animated.View style={styles.cardStack}>
                {tracks.map((item, index) => {
                  const offset = index - selectedTrackIndex;
                  const isVisible = Math.abs(offset) <= 3;
                  const isTopCard = offset === 0;

                  if (!isVisible) return null;

                  // Animated offset for smooth transitions
                  const animatedOffset = Animated.subtract(
                    new Animated.Value(index),
                    animatedIndex,
                  );

                  // Calculate throw animation transforms for top card
                  const getAnimatedStyle = () => {
                    if (!isTopCard || !isAnimating) return {};

                    // Calculate rotation based on swipe direction
                    const rotationDeg =
                      (Math.atan2(swipeVector.y, swipeVector.x) *
                        (180 / Math.PI)) /
                      10;

                    return {
                      transform: [
                        {
                          translateX: throwAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, swipeVector.x],
                          }),
                        },
                        {
                          translateY: throwAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, swipeVector.y],
                          }),
                        },
                        {
                          rotate: throwAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0deg", `${rotationDeg}deg`],
                          }),
                        },
                        {
                          scale: throwAnim.interpolate({
                            inputRange: [0, 0.3, 1],
                            outputRange: [1, 1.05, 0.9],
                          }),
                        },
                      ],
                      opacity: throwAnim.interpolate({
                        inputRange: [0, 0.6, 1],
                        outputRange: [1, 0.9, 0],
                      }),
                    };
                  };

                  const CardWrapper =
                    isTopCard && isAnimating ? Animated.View : Animated.View;

                  // Base animated transforms for all cards
                  const baseTransforms = {
                    transform: [
                      {
                        translateY: animatedOffset.interpolate({
                          inputRange: [-3, 0, 3],
                          outputRange: [75, 0, -75],
                        }),
                      },
                      {
                        translateX: animatedOffset.interpolate({
                          inputRange: [-3, 0, 3],
                          outputRange: [-150, 0, 150],
                        }),
                      },
                      {
                        scale: animatedOffset.interpolate({
                          inputRange: [-3, 0, 3],
                          outputRange: [0.85, 1, 0.85],
                          extrapolate: "clamp",
                        }),
                      },
                    ],
                    opacity: animatedOffset.interpolate({
                      inputRange: [-1, 0, 1, 2, 3],
                      outputRange: [0, 1, 1, 1, 1],
                      extrapolate: "clamp",
                    }),
                  };

                  return (
                    <CardWrapper
                      key={`stack-${item.track?.trackId || item.track?.id || index}-${index}`}
                      style={[
                        styles.stackedCard,
                        {
                          backgroundColor: colors.card,
                          zIndex: 100 - Math.abs(offset),
                        },
                        baseTransforms,
                        isTopCard && isAnimating && getAnimatedStyle(),
                      ]}
                    >
                      <Pressable
                        style={styles.stackedCardPressable}
                        onPress={() => {
                          if (!isAnimating) {
                            if (offset !== 0) {
                              setSelectedTrackIndex(index);
                            } else {
                              router.push(
                                `/song/${item.track?.trackId}` as RelativePathString,
                              );
                            }
                          }
                        }}
                      >
                        <Image
                          source={{
                            uri: item.track?.album?.images[0]?.url || "",
                          }}
                          style={styles.stackedCardImage}
                          contentFit="cover"
                          transition={200}
                        />
                      </Pressable>
                    </CardWrapper>
                  );
                })}
              </Animated.View>
            </PanGestureHandler>
          </GestureHandlerRootView>

          {/* Bottom Track Info Bar */}
          <View
            style={[
              styles.bottomTrackBar,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.bottomTrackInfo}>
              <View style={styles.bottomTrackDetails}>
                <ThemedText
                  style={[styles.bottomTrackName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedTrack?.name || "Unknown Track"}
                </ThemedText>
                <ThemedText
                  style={[styles.bottomTrackArtist, { color: colors.icon }]}
                  numberOfLines={1}
                >
                  {selectedTrack?.artists?.map((a: any) => a.name).join(", ") ||
                    "Unknown Artist"}
                </ThemedText>
              </View>
              <Pressable
                style={[styles.carouselPlayButton, { backgroundColor: Colors.primary }]}
                onPress={() => {
                  router.push(
                    `/song/${selectedTrack?.trackId}` as RelativePathString,
                  );
                }}
              >
                <Ionicons name="play" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </>
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
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderWrapper: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 32,
  },
  floatingViewToggle: {
    position: "absolute",
    top: 50,
    right: 16,
    zIndex: 10,
  },
  blurButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  coverContainer: {
    position: "relative",
    marginTop: 20,
  },
  playlistCover: {
    width: HEADER_IMAGE_SIZE,
    height: HEADER_IMAGE_SIZE,
    borderRadius: 12,
  },
  coverShadow: {
    position: "absolute",
    top: 20,
    left: 10,
    right: 10,
    bottom: -10,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    zIndex: -1,
  },
  playlistInfo: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 8,
  },
  playlistName: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  playlistDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
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
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  playButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  // Action buttons section
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
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
  // Track list (matching album style)
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
  trackCover: {
    width: 44,
    height: 44,
    borderRadius: 4,
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

  // Carousel View Styles
  carouselHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  carouselBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  compactPlaylistInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  compactCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  compactDetails: {
    flex: 1,
  },
  compactName: {
    fontSize: 16,
    fontWeight: "700",
  },
  compactStats: {
    fontSize: 12,
    marginTop: 2,
  },
  carouselViewToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomTrackBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    padding: 16,
    paddingBottom: 32,
  },
  bottomTrackInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bottomTrackDetails: {
    flex: 1,
  },
  bottomTrackName: {
    fontSize: 16,
    fontWeight: "600",
  },
  bottomTrackArtist: {
    fontSize: 13,
    marginTop: 2,
  },
  carouselPlayButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  // Stacked Records View Styles
  stackContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cardStack: {
    width: SCREEN_WIDTH * 0.75,
    aspectRatio: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  stackedCard: {
    position: "absolute",
    width: "100%",
    aspectRatio: 1,
    borderRadius: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  stackedCardImage: {
    width: "100%",
    height: "100%",
  },
  stackedCardPressable: {
    width: "100%",
    height: "100%",
  },
});
