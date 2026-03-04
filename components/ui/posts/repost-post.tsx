import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import feedApi, { FeedPost } from "@/services/feedApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import PostHeader from "./post-header";

interface RepostPostProps {
  item: FeedPost;
  onDelete?: (postId: number) => void;
}

/**
 * Renders a reposted post. Shows a "reposted by [user]" banner,
 * then the original post content nested inside a card.
 */
export default function RepostPost({ item, onDelete }: RepostPostProps) {
  const { colors } = useTheme();

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const originalUser = item.originalPostUser;

  // Determine what content the original post had
  const track = item.track;
  const album = item.album;
  const playlist = item.playlist;
  const artist = item.artist;

  const getContentNavigation = () => {
    if (track) return () => router.push(`/song/${track.id}`);
    if (album) return () => router.push(`/album/${album.spotifyId}` as any);
    if (playlist) return () => router.push(`/playlist/${playlist.spotifyId}` as any);
    if (artist) return () => router.push(`/artist/${artist.spotifyId}`);
    return undefined;
  };

  const handlePress = getContentNavigation();

  const getImageUrl = (): string | null => {
    if (track?.albumImageUrl) return track.albumImageUrl;
    if (album?.imageUrl) return album.imageUrl;
    if (playlist?.imageUrl) return playlist.imageUrl;
    if (artist?.imageUrl) return artist.imageUrl;
    return null;
  };

  const getContentTitle = (): string => {
    if (track) return track.name || "Unknown Track";
    if (album) return album.name || "Unknown Album";
    if (playlist) return playlist.name || "Unknown Playlist";
    if (artist) return artist.name || "Unknown Artist";
    return "Unknown";
  };

  const getContentSubtitle = (): string | null => {
    if (track) return track.artistNames.join(", ") || null;
    if (album) return "Album";
    if (playlist) return "Playlist";
    if (artist) return "Artist";
    return null;
  };

  const imageUrl = getImageUrl();

  return (
    <View style={styles.container}>
      {/* Repost banner */}
      <Pressable
        style={styles.repostBanner}
        onPress={() => router.push(`/profile/${item.user.id}`)}
      >
        <MaterialIcons name="repeat" size={14} color={Colors.primary} />
        <ThemedText style={[styles.repostText, { color: colors.text }]}>
          {item.user.displayName || item.user.handle} reposted
        </ThemedText>
      </Pressable>

      {/* Original post content */}
      <Pressable onPress={handlePress}>
        {/* Original poster header — use originalPostUser for the header, 
            but like/repost interactions target the original post */}
        {originalUser && (
          <PostHeader
            user={originalUser}
            timeAgo={timeAgo}
            postId={item.originalPostId ?? undefined}
            onDelete={undefined}
            initialLiked={item.isLiked}
            initialLikeCount={item.likeCount}
            initialReposted={item.isReposted}
            initialRepostCount={item.repostCount}
          />
        )}

        {/* Content card */}
        <View style={styles.centerContainer}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {imageUrl && (
              <Image
                source={{ uri: imageUrl }}
                style={artist ? styles.artistImage : styles.cardImage}
                contentFit="cover"
                transition={200}
              />
            )}
            <View style={[styles.cardContent, { backgroundColor: colors.card }]}>
              <ThemedText
                style={[styles.cardTitle, { color: colors.text }]}
                numberOfLines={2}
              >
                {getContentTitle()}
              </ThemedText>
              {getContentSubtitle() && (
                <ThemedText
                  style={[styles.cardSubtitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {getContentSubtitle()}
                </ThemedText>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  repostBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  repostText: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.6,
  },
  centerContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: {
    width: "100%",
    aspectRatio: 1,
  },
  artistImage: {
    width: "100%",
    aspectRatio: 1.2,
  },
  cardContent: {
    padding: 16,
    justifyContent: "flex-end",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
});
