import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import feedApi, { FeedPost } from "@/services/feedApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "../themed-text";
import PostHeader from "./post-header";

interface SharedArtistPostProps {
  item: FeedPost;
  onDelete?: (postId: number) => void;
}

export default function SharedArtistPost({ item, onDelete }: SharedArtistPostProps) {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();

  const artist = item.artist;
  const user = item.user;
  const timeAgo = feedApi.getTimeAgo(item.createdAt);

  if (!artist) return null;

  const handlePress = () => {
    router.push(`/artist/${artist.spotifyId}`);
  };

  const handleProfilePress = () => {
    router.push(`/profile/${user.id === currentUser?.id ? "" : user.id}`);
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
        {/* Left Column */}
        <View style={styles.leftColumn}>

          <View style={styles.textContainer}>
            <ThemedText type="defaultSemiBold" style={[styles.artistNameLabel, { color: colors.text }]}>
              {artist.name}
            </ThemedText>

            {caption && (
              <ThemedText
                style={[styles.caption, { color: colors.text + "99" }]}
                numberOfLines={6}
              >
                {caption}
                <ThemedText type="defaultSemiBold" style={[styles.seeMore, { color: colors.text }]}>
                  {"\n"}See more
                </ThemedText>
              </ThemedText>
            )}
          </View>
        </View>

        {/* Right Column */}
        <View style={styles.rightColumn}>
          <Image
            source={{ uri: artist.imageUrl || "https://i.pravatar.cc/300" }}
            style={styles.artistImage}
            contentFit="cover"
            transition={200}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 24,
  },
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  leftColumn: {
    flex: 1,
    paddingRight: 16,
  },
  textContainer: {
    marginTop: 4,
  },
  artistNameLabel: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  seeMore: {
    fontSize: 14,
    lineHeight: 20,
  },
  rightColumn: {
    width: "60%",
    aspectRatio: 0.8,
    borderRadius: 8,
    overflow: "hidden",
  },
  artistImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(128,128,128,0.1)",
  },
});
