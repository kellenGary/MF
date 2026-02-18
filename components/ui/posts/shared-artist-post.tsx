import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import feedApi, { FeedPost } from "@/services/feedApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Alert, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";

interface SharedArtistPostProps {
  item: FeedPost;
  onDelete?: (postId: number) => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function SharedArtistPost({ item, onDelete }: SharedArtistPostProps) {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const artist = item.artist;
  const user = item.user;
  const isOwnPost = currentUser?.id === user.id;

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

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      {/* Background Image */}
      <Image
        source={{ uri: artist.imageUrl || "https://i.pravatar.cc/300" }}
        style={styles.backgroundImage}
        contentFit="cover"
        transition={200}
      />

      {/* Gradient Overlays */}
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.4)", "transparent"]}
        style={styles.topGradient}
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.6)"]}
        style={styles.bottomGradient}
      />

      {/* Content Container */}
      <View style={styles.content}>
        {/* Custom Header with White Text for contrast */}
        <View style={styles.header}>
          <Pressable onPress={handleProfilePress} style={styles.headerRow}>
            <Image
              source={{ uri: user.profileImageUrl || "https://i.pravatar.cc/100" }}
              style={styles.avatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user.displayName || user.handle}
              </Text>
              <Text style={styles.timeAgo}>
                {timeAgo} • Shared an artist
              </Text>
            </View>
          </Pressable>
          {isOwnPost && onDelete && (
            <Pressable hitSlop={8} onPress={handleDelete} style={styles.deleteButton}>
              <MaterialIcons name="delete-outline" size={22} color="rgba(255,255,255,0.8)" />
            </Pressable>
          )}
        </View>

        {/* Artist Info */}
        <View style={styles.artistInfo}>
          <Text style={styles.label}>ARTIST</Text>
          <Text style={styles.artistName} numberOfLines={2}>
            {artist.name}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 24,
    backgroundColor: "#1a1a1a", // Fallback color
    position: "relative",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
  },
  userInfo: {
    marginLeft: 10,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeAgo: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    fontWeight: "500",
  },
  artistInfo: {
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  artistName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 40,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  deleteButton: {
    opacity: 0.8,
  },
});
