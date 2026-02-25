import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { FeedTrack } from "@/services/feedApi";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

// Card dimensions
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = 280;
const CARD_HEIGHT = 350;
const CARD_OVERLAP = 50;

// --- Grouped item types ---

type CarouselItem =
  | { type: "track"; track: FeedTrack }
  | {
      type: "album";
      albumName: string;
      albumImageUrl: string | null;
      tracks: FeedTrack[];
    };

/**
 * Groups consecutive tracks that share the same albumName into album items.
 * Solo tracks (no consecutive neighbour with the same album) stay as individual track items.
 */
function groupTracks(tracks: FeedTrack[]): CarouselItem[] {
  const items: CarouselItem[] = [];
  let i = 0;

  while (i < tracks.length) {
    const current = tracks[i];
    // Collect consecutive tracks with the same album
    let j = i + 1;
    while (
      j < tracks.length &&
      tracks[j].albumName &&
      tracks[j].albumName === current.albumName
    ) {
      j++;
    }

    const count = j - i;
    if (count >= 2 && current.albumName) {
      // Group into an album card
      items.push({
        type: "album",
        albumName: current.albumName,
        albumImageUrl: current.albumImageUrl,
        tracks: tracks.slice(i, j),
      });
    } else {
      // Single track
      items.push({ type: "track", track: current });
    }

    i = j;
  }

  return items;
}

export interface TrackCarouselProps {
  tracks: FeedTrack[];
  /** Optional callback when a track is pressed. If not provided, navigates to /song/{id} */
  onTrackPress?: (track: FeedTrack, index: number) => void;
  /** Optional callback when carousel scroll reaches near the end */
  onEndReached?: () => void;
}

export default function TrackCarousel({
  tracks,
  onTrackPress,
  onEndReached,
}: TrackCarouselProps) {
  const { colors } = useTheme();

  const scrollOffset = useSharedValue(0);
  const savedOffset = useSharedValue(0);

  if (!tracks || tracks.length === 0) return null;

  const items = groupTracks(tracks);
  const maxOffset = Math.max(0, (items.length - 1) * CARD_OVERLAP);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const newOffset = savedOffset.value - event.translationX;
      if (newOffset < 0) {
        scrollOffset.value = newOffset * 0.3;
      } else if (newOffset > maxOffset) {
        scrollOffset.value = maxOffset + (newOffset - maxOffset) * 0.3;
      } else {
        scrollOffset.value = newOffset;
      }
    })
    .onEnd((event) => {
      const velocity = -event.velocityX;
      const projectedOffset = scrollOffset.value + velocity * 0.1;
      const nearestCard = Math.round(projectedOffset / CARD_OVERLAP);
      const clampedCard = Math.max(0, Math.min(nearestCard, items.length - 1));
      const targetOffset = clampedCard * CARD_OVERLAP;

      scrollOffset.value = withSpring(targetOffset, {
        damping: 10000,
        stiffness: 500,
        velocity: velocity,
      });
      savedOffset.value = targetOffset;

      if (clampedCard >= items.length - 3 && onEndReached) {
        runOnJS(onEndReached)();
      }
    });

  const handleTrackPress = (track: FeedTrack, index: number) => {
    if (onTrackPress) {
      onTrackPress(track, index);
    } else {
      router.push(`/song/${track.id}`);
    }
  };

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.carouselContainer}>
        <View style={styles.carouselTrack}>
          {items.map((item, index) => {
            if (item.type === "album") {
              return (
                <StackedAlbumCard
                  key={`album-${item.albumName}-${index}`}
                  albumName={item.albumName}
                  albumImageUrl={item.albumImageUrl}
                  albumTracks={item.tracks.reverse()}
                  index={index}
                  totalCards={items.length}
                  scrollOffset={scrollOffset}
                  colors={colors}
                  onTrackPress={(track) => handleTrackPress(track, index)}
                />
              );
            }
            return (
              <StackedCard
                key={`${item.track.spotifyId}-${index}`}
                track={item.track}
                index={index}
                totalCards={items.length}
                scrollOffset={scrollOffset}
                colors={colors}
                onPress={() => handleTrackPress(item.track, index)}
              />
            );
          })}
        </View>
      </View>
    </GestureDetector>
  );
}

// ----- Shared animation hook -----

function useStackedAnimation(
  index: number,
  totalCards: number,
  scrollOffset: SharedValue<number>,
) {
  const centerOffset = useDerivedValue(() => {
    const basePosition = index * CARD_OVERLAP;
    const relativePosition = basePosition - scrollOffset.value;
    return relativePosition / CARD_OVERLAP;
  });

  const animatedStyle = useAnimatedStyle(() => {
    const absoluteCenterOffset = Math.abs(centerOffset.value);

    const minWidth = 20;
    const width = interpolate(
      absoluteCenterOffset,
      [0, 1],
      [CARD_WIDTH, minWidth],
      Extrapolation.CLAMP,
    );

    const translateX = interpolate(
      centerOffset.value,
      [-2, -1, 0, 1, 2],
      [-minWidth * 2, -minWidth, 0, CARD_WIDTH, CARD_WIDTH + minWidth],
      Extrapolation.EXTEND,
    );

    const zIndex = totalCards - index;

    return {
      transform: [{ translateX }],
      width,
      zIndex,
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    const absoluteCenterOffset = Math.abs(centerOffset.value);
    const opacity = interpolate(
      absoluteCenterOffset,
      [0, 0.3, 0.5],
      [1, 0.5, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const isCentered = () => Math.abs(centerOffset.value) < 0.1;

  return { animatedStyle, textAnimatedStyle, isCentered };
}

// ----- Single Track Card -----

interface StackedCardProps {
  track: FeedTrack;
  index: number;
  totalCards: number;
  scrollOffset: SharedValue<number>;
  colors: typeof Colors.light;
  onPress: () => void;
}

function StackedCard({
  track,
  index,
  totalCards,
  scrollOffset,
  colors,
  onPress,
}: StackedCardProps) {
  const { animatedStyle, textAnimatedStyle, isCentered } = useStackedAnimation(
    index,
    totalCards,
    scrollOffset,
  );

  const handlePress = () => {
    if (isCentered()) {
      onPress();
    }
  };

  return (
    <Animated.View style={[styles.stackedCard, animatedStyle]}>
      <Pressable
        style={[styles.cardInner, { backgroundColor: colors.card }]}
        onPress={handlePress}
      >
        {track.albumImageUrl && (
          <Image
            source={{ uri: track.albumImageUrl }}
            style={styles.cardImage}
          />
        )}
        <View style={[styles.cardContent, { backgroundColor: colors.card }]}>
          <Animated.View style={textAnimatedStyle}>
            <ThemedText
              style={[styles.cardTrackName, { color: colors.text }]}
              numberOfLines={2}
            >
              {track.name || "Unknown Track"}
            </ThemedText>
            <ThemedText
              style={[styles.cardArtistName, { color: colors.text }]}
              numberOfLines={1}
            >
              {track.artistNames?.join(", ") || "Unknown Artist"}
            </ThemedText>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ----- Album Group Card -----

interface StackedAlbumCardProps {
  albumName: string;
  albumImageUrl: string | null;
  albumTracks: FeedTrack[];
  index: number;
  totalCards: number;
  scrollOffset: SharedValue<number>;
  colors: typeof Colors.light;
  onTrackPress: (track: FeedTrack) => void;
}

function StackedAlbumCard({
  albumName,
  albumImageUrl,
  albumTracks,
  index,
  totalCards,
  scrollOffset,
  colors,
  onTrackPress,
}: StackedAlbumCardProps) {
  const { animatedStyle, textAnimatedStyle, isCentered } = useStackedAnimation(
    index,
    totalCards,
    scrollOffset,
  );

  return (
    <Animated.View style={[styles.stackedCard, animatedStyle]}>
      <View style={[styles.cardInner, { backgroundColor: colors.card }]}>
        {albumImageUrl && (
          <Pressable
            onPress={() => {
              if (isCentered() && albumTracks[0]?.albumId) router.push(`/album/${albumTracks[0].albumId}`);
            }}
          >
            <Image
              source={{ uri: albumImageUrl }}
              style={styles.albumCardImage}
            />
          </Pressable>
        )}
        <View
          style={[styles.albumCardContent, { backgroundColor: colors.card }]}
        >
          <Animated.View style={[textAnimatedStyle, { flex: 1 }]}>
            <ThemedText
              style={[styles.albumCardTitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {albumName}
            </ThemedText>
            <ThemedText
              style={[styles.cardArtistName, { color: colors.text }]}
              numberOfLines={1}
            >
              {albumTracks[0]?.artistNames?.join(", ") || "Unknown Artist"}
            </ThemedText>
            <ScrollView
              style={styles.tracklistScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {albumTracks.map((t, i) => (
                <Pressable
                  key={`${t.spotifyId}-${i}`}
                  style={styles.tracklistRow}
                  onPress={() => {
                    if (isCentered()) onTrackPress(t);
                  }}
                >
                  <ThemedText
                    style={[styles.tracklistNumber, { color: colors.text }]}
                  >
                    {i + 1}
                  </ThemedText>
                  <ThemedText
                    style={[styles.tracklistName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {t.name || "Unknown Track"}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    height: CARD_HEIGHT,
    overflow: "visible",
  },
  carouselTrack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingLeft: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    height: CARD_HEIGHT,
  },
  stackedCard: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardInner: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // --- Single track card ---
  cardImage: {
    width: CARD_WIDTH,
    aspectRatio: 1,
    resizeMode: "cover",
  },
  cardContent: {
    padding: 12,
    justifyContent: "flex-end",
  },
  cardTrackName: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardArtistName: {
    fontSize: 12,
    opacity: 0.6,
  },
  // --- Album group card ---
  albumCardImage: {
    width: CARD_WIDTH,
    height: 140,
    resizeMode: "cover",
  },
  albumCardContent: {
    flex: 1,
    padding: 12,
  },
  albumCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  tracklistScroll: {
    marginTop: 8,
    flex: 1,
  },
  tracklistRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 8,
  },
  tracklistNumber: {
    fontSize: 12,
    opacity: 0.4,
    width: 18,
    textAlign: "right",
  },
  tracklistName: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
});
