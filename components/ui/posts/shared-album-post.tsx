import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import feedApi, { FeedPost } from "@/services/feedApi";
import spotifyApi from "@/services/spotifyApi";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "../themed-text";
import PostHeader from "./post-header";

interface SharedAlbumPostProps {
  item: FeedPost;
  onDelete?: (postId: number) => void;
}

interface AlbumTrack {
  name: string;
  track_number: number;
}

export default function SharedAlbumPost({ item, onDelete }: SharedAlbumPostProps) {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const album = item.album;
  const user = item.user;

  const [tracks, setTracks] = useState<AlbumTrack[]>([]);
  const [imageHeight, setImageHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!album?.spotifyId) return;
    spotifyApi.getAlbumWithTracks(album.spotifyId).then((data) => {
      if (data?.tracks?.items) {
        setTracks(
          data.tracks.items.map((t: any) => ({
            name: t.name,
            track_number: t.track_number,
          }))
        );
      }
    }).catch(() => { /* silently fail */ });
  }, [album?.spotifyId]);

  if (!album) return null;

  const handlePress = () => {
    router.push(`/album/${album.spotifyId}` as any);
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await feedApi.deletePost(item.id);
              onDelete(item.id);
            } catch (error) {
              Alert.alert("Error", "Failed to delete post. Please try again.");
            }
          },
        },
      ]
    );
  };

  const caption = feedApi.getCaption(item);
  const maxTracksShown = 5;
  const displayTracks = tracks.slice(0, maxTracksShown);
  const remainingCount = tracks.length - maxTracksShown;

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <PostHeader
        user={user}
        timeAgo={timeAgo}
        postId={item.id}
        onDelete={onDelete}
        initialLiked={item.isLiked}
        initialLikeCount={item.likeCount}
        initialReposted={item.isReposted}
        initialRepostCount={item.repostCount}
      />

      <View style={styles.contentRow}>
        {/* Left Column — Album Art */}
        <View
          style={styles.leftColumn}
          onLayout={(e) => setImageHeight(e.nativeEvent.layout.height)}
        >
          <Image
            source={{ uri: album.imageUrl || "" }}
            style={styles.albumImage}
            contentFit="cover"
            transition={200}
          />
        </View>

        {/* Right Column — Album Info + Tracklist */}
        <View style={[styles.rightColumn, imageHeight != null && { height: imageHeight }]}>
          {/* Scrollable content area */}
          <View style={styles.rightColumnInner}>
            <ThemedText type="defaultSemiBold" style={[styles.albumName, { color: colors.text }]}>
              {album.name}
            </ThemedText>

            {caption && (
              <ThemedText
                style={[styles.caption, { color: colors.text + "99" }]}
                numberOfLines={2}
              >
                {caption}
              </ThemedText>
            )}

            {displayTracks.length > 0 && (
              <View style={styles.trackList}>
                <ThemedText style={[styles.trackListLabel, { color: colors.text + "60" }]}>
                  TRACKLIST
                </ThemedText>
                {displayTracks.map((track, index) => (
                  <View key={index} style={styles.trackRow}>
                    <ThemedText style={[styles.trackNumber, { color: colors.text + "50" }]}>
                      {track.track_number}
                    </ThemedText>
                    <ThemedText
                      style={[styles.trackName, { color: colors.text + "CC" }]}
                      numberOfLines={1}
                    >
                      {track.name}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Pinned at bottom, outside clipped area */}
          {remainingCount > 0 && (
            <ThemedText style={[styles.moreText, { color: colors.text + "60" }]}>
              +{remainingCount} more tracks
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  contentRow: {
    flexDirection: "row",
    gap: 14,
  },
  leftColumn: {
    width: "45%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  albumImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(128,128,128,0.1)",
  },
  rightColumn: {
    flex: 1,
    paddingTop: 2,
    justifyContent: "space-between",
  },
  rightColumnInner: {
    flex: 1,
    overflow: "hidden",
  },
  albumName: {
    fontSize: 16,
    lineHeight: 22,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  trackList: {
    marginTop: 4,
  },
  trackListLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  trackNumber: {
    fontSize: 12,
    width: 18,
    fontVariant: ["tabular-nums"],
  },
  trackName: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  moreText: {
    fontSize: 12,
    marginTop: 2,
  },
});
