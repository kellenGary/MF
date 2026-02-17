import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import feedApi, { FeedUser } from "@/services/feedApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

interface PostHeaderProps {
  user: FeedUser;
  timeAgo: string;
  postId?: number;
  onDelete?: (postId: number) => void;
  initialLiked?: boolean;
  initialLikeCount?: number;
  initialReposted?: boolean;
  initialRepostCount?: number;
}

export default function PostHeader({
  user,
  timeAgo,
  postId,
  onDelete,
  initialLiked = false,
  initialLikeCount = 0,
  initialReposted = false,
  initialRepostCount = 0,
}: PostHeaderProps) {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();

  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isReposted, setIsReposted] = useState(initialReposted);
  const [repostCount, setRepostCount] = useState(initialRepostCount);

  const isOwnPost = currentUser?.id === user.id;

  // Verify status on mount to ensure consistency
  useEffect(() => {
    if (!postId) return;

    const checkStatus = async () => {
      try {
        const [likeStatus, repostStatus] = await Promise.all([
          feedApi.getLikeStatus(postId),
          feedApi.getRepostStatus(postId)
        ]);

        setIsLiked(likeStatus.isLiked);
        setLikeCount(likeStatus.likeCount); // Sync count too

        setIsReposted(repostStatus.isReposted);
        setRepostCount(repostStatus.repostCount);
      } catch (error) {
        // Silently fail and rely on initial props if fetch fails
        console.log("Failed to sync interaction status", error);
      }
    };

    checkStatus();
  }, [postId]);

  const handleProfilePress = () => {
    router.push(`/profile/${user.id === currentUser?.id ? "" : user.id}`);
  };

  const handleDelete = () => {
    if (!postId || !onDelete) return;
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
              await feedApi.deletePost(postId);
              onDelete(postId);
            } catch (error) {
              Alert.alert("Error", "Failed to delete post. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleLike = async () => {
    if (!postId) return;

    const prevLiked = isLiked;
    const prevCount = likeCount;

    setIsLiked(!isLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      if (prevLiked) {
        await feedApi.unlikePost(postId);
      } else {
        await feedApi.likePost(postId);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  const handleRepost = async () => {
    if (!postId) return;

    // Prevent reposting own posts if that's a rule, but usually allowed in some platforms.
    // Assuming allowed for now.

    const prevReposted = isReposted;
    const prevCount = repostCount;

    setIsReposted(!isReposted);
    setRepostCount(prevReposted ? prevCount - 1 : prevCount + 1);

    try {
      if (prevReposted) {
        await feedApi.removeRepost(postId);
      } else {
        await feedApi.repostPost(postId);
      }
    } catch (error) {
      console.error("Failed to toggle repost:", error);
      setIsReposted(prevReposted);
      setRepostCount(prevCount);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.userInfo} onPress={handleProfilePress}>
        <Image
          source={{ uri: user.profileImageUrl || "https://i.pravatar.cc/100" }}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <ThemedText style={[styles.name, { color: colors.text }]}>
            {user.displayName || user.handle}
          </ThemedText>
          <ThemedText style={[styles.time, { color: colors.text }]}>
            {timeAgo}
          </ThemedText>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          hitSlop={12}
          style={styles.actionButton}
          onPress={handleLike}
        >
          <AnimatedHeart isLiked={isLiked} />
          {likeCount > 0 && (
            <ThemedText style={[styles.actionCount, { color: colors.text }]}>
              {likeCount}
            </ThemedText>
          )}
        </Pressable>

        <Pressable
          hitSlop={12}
          style={styles.actionButton}
          onPress={handleRepost}
        >
          <AnimatedRepost isReposted={isReposted} />
          {repostCount > 0 && (
            <ThemedText style={[styles.actionCount, { color: colors.text }]}>
              {repostCount}
            </ThemedText>
          )}
        </Pressable>

        {isOwnPost && postId && onDelete && (
          <Pressable hitSlop={12} style={styles.actionButton} onPress={handleDelete}>
            <MaterialIcons name="delete-outline" size={22} color={colors.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function AnimatedHeart({ isLiked }: { isLiked: boolean }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isLiked) {
      scale.value = withSequence(
        withSpring(1.2),
        withSpring(1)
      );
    } else {
      scale.value = withSpring(1);
    }
  }, [isLiked]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <MaterialIcons
        name={isLiked ? "favorite" : "favorite-border"}
        size={22}
        color={isLiked ? colors.likeButton.liked : colors.text}
      />
    </Animated.View>
  );
}

function AnimatedRepost({ isReposted }: { isReposted: boolean }) {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isReposted) {
      // Spin effect
      rotation.value = withSequence(
        withTiming(360, { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(0, { duration: 0 }) // Instant reset for next time, but keeps it 'reposted' visually via color
      );
    }
  }, [isReposted]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <MaterialIcons
        name="repeat"
        size={22}
        // When active, use primary color (or a distinct repost color)
        color={isReposted ? Colors.primary : colors.text}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  info: {
    marginLeft: 10,
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
    opacity: 0.6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 8,
  },
  actionButton: {
    flexDirection: "row",
    position: "relative",
    alignItems: "center",
    gap: 4,
    opacity: 0.9,
    minWidth: 40, // Ensure tap target size
    justifyContent: 'center'
  },
  actionCount: {
    fontSize: 12,
    opacity: 0.7,
    position: "absolute",
    bottom: -18,
    left: 0,
    right: 0,
    textAlign: "center",
    width: '100%'
  },
});
