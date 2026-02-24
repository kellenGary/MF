import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import feedApi, { FeedPost } from "@/services/feedApi";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  SharedValue,
} from "react-native-reanimated";
import spotifyApi from "@/services/spotifyApi";
import PostHeader from "./post-header";

function TrackCoverItem({ imageUrl, index, isAnimating }: { imageUrl: string, index: number, isAnimating: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    // Fanning out for larger covers
    const rotateDeg = index === 0 ? -10 : index === 1 ? 10 : -18;
    const translateX = index === 0 ? -35 : index === 1 ? 35 : -55;
    const translateY = index === 0 ? -5 : index === 1 ? -5 : -15;
    const scale = 0.9;

    return {
      transform: [
        { translateX: isAnimating.value * translateX },
        { translateY: isAnimating.value * translateY },
        { rotate: `${isAnimating.value * rotateDeg}deg` },
        { scale },
      ],
      opacity: withTiming(isAnimating.value, { duration: 450 }),
    };
  });

  return (
    <Animated.View style={[styles.trackCoverWrapper, animatedStyle]}>
      <Image source={{ uri: imageUrl }} style={styles.trackCover} />
    </Animated.View>
  );
}

interface SharedPlaylistPostProps {
  item: FeedPost;
  onDelete?: (postId: number) => void;
}

export default function SharedPlaylistPost({ item, onDelete }: SharedPlaylistPostProps) {
  const { colors } = useTheme();

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const caption = feedApi.getCaption(item);
  const playlist = item.playlist;

  const [trackImages, setTrackImages] = useState<string[]>([]);
  const isAnimating = useSharedValue(0);

  useEffect(() => {
    if (playlist?.spotifyId) {
      spotifyApi.getPlaylistTracks(playlist.spotifyId).then((data) => {
        if (data?.items) {
          // Extract unique album art for first few tracks
          const images = new Set<string>();
          for (const trackItem of data.items) {
            const url = trackItem.track?.album?.images?.[0]?.url;
            if (url) {
              images.add(url);
            }
            if (images.size >= 3) break;
          }
          const loadedImages = Array.from(images);
          setTrackImages(loadedImages);

          if (loadedImages.length > 0) {
            isAnimating.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 90 }));
          }
        }
      }).catch((e) => {
        console.log("Failed to fetch playlist tracks for animation", e);
      });
    }
  }, [playlist?.spotifyId]);

  if (!playlist) return null;

  return (
    <Pressable
      style={[
        styles.card,
      ]}
      onPress={() => {
        /* Navigate to playlist */
      }}
    >
      <PostHeader
        user={item.user}
        timeAgo={timeAgo}
        postId={item.id}
        onDelete={onDelete}
        initialLiked={item.isLiked}
        initialLikeCount={item.likeCount}
        initialReposted={item.isReposted}
        initialRepostCount={item.repostCount}
      />

      {caption && (
        <ThemedText style={[styles.caption, { color: colors.text }]}>{caption}</ThemedText>
      )}

      <View style={[styles.playlistCard]}>
        <View style={styles.imageStackContainer}>
          {trackImages.map((imageUrl, index) => (
            <TrackCoverItem
              key={index}
              imageUrl={imageUrl}
              index={index}
              isAnimating={isAnimating}
            />
          ))}
          <View style={styles.mainCoverWrapper}>
            <Image
              source={{ uri: playlist.imageUrl || "" }}
              style={styles.playlistImage}
            />
          </View>
        </View>
        <View style={styles.playlistFooter}>
          <View style={styles.playlistInfo}>
            <ThemedText style={[styles.playlistLabel, { color: colors.text }]}>
              PLAYLIST
            </ThemedText>
            <ThemedText
              style={[styles.playlistName, { color: colors.text }]}
              numberOfLines={2}
            >
              {playlist.name}
            </ThemedText>
          </View>
          <View style={[styles.playIcon, { backgroundColor: Colors.primary }]}>
            <ThemedText style={styles.playIconText}>▶</ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
  },
  caption: {
    fontSize: 15,
    marginBottom: 12,
    lineHeight: 20,
  },
  playlistCard: {
    borderRadius: 16,
    padding: 16,
    overflow: "hidden", // Prevents animated covers from overflowing too much
  },
  imageStackContainer: {
    width: "100%",
    height: 260,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  mainCoverWrapper: {
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  playlistImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
  },
  trackCoverWrapper: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },
  trackCover: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  playlistFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  playlistInfo: {
    flex: 1,
    marginRight: 12,
  },
  playlistLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    opacity: 0.6,
    marginBottom: 4,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: "700",
  },
  playIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  playIconText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 3,
  },
});
