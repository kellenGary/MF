import { ThemedText } from "@/components/ui/themed-text";
import FeedItemRouter from "@/components/ui/posts/feed-item-router";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import feedApi, { FeedPost, FeedResponse } from "@/services/feedApi";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import PostFilterChips, {
  getPostTypeForFilter,
  PostFilterType,
} from "./post-filter-chips";

const PAGE_SIZE = 20;

interface ProfilePostsProps {
  userId: number;
  isOwnProfile: boolean;
}

export default function ProfilePosts({ userId, isOwnProfile }: ProfilePostsProps) {
  const { colors } = useTheme();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<PostFilterType>("All");
  const offsetRef = useRef(0);

  const fetchPosts = useCallback(
    async (offset: number = 0, isRefresh: boolean = false) => {
      try {
        const postType = getPostTypeForFilter(activeFilter);
        const response: FeedResponse = await feedApi.getUserPosts(
          userId,
          PAGE_SIZE,
          offset,
          postType
        );

        if (isRefresh || offset === 0) {
          setPosts(response.items);
        } else {
          setPosts((prev) => [...prev, ...response.items]);
        }

        offsetRef.current = offset + response.items.length;
        setHasMore(response.items.length === PAGE_SIZE);
      } catch (error) {
        console.error("Failed to fetch user posts:", error);
      }
    },
    [userId, activeFilter]
  );

  // Initial load & reload when filter changes
  useEffect(() => {
    setLoading(true);
    offsetRef.current = 0;
    fetchPosts(0, true).finally(() => setLoading(false));
  }, [fetchPosts]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPosts(offsetRef.current);
    setLoadingMore(false);
  }, [loadingMore, hasMore, fetchPosts]);

  const handleDeletePost = useCallback((postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handleFilterChange = useCallback((filter: PostFilterType) => {
    setActiveFilter(filter);
  }, []);

  // Use screen height as minimum so content never collapses when switching tabs
  const minContentHeight = Dimensions.get("window").height * 0.5;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { minHeight: minContentHeight }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { minHeight: minContentHeight }]}>
      {/* Filter Chips */}
      <PostFilterChips
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="dynamic-feed"
            size={48}
            color={colors.mutedForeground}
          />
          <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
            No posts yet
          </ThemedText>
          <ThemedText
            style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
          >
            {isOwnProfile
              ? "Share your favorite music to see it here"
              : "This user hasn't posted anything yet"}
          </ThemedText>
          {isOwnProfile && (
            <Pressable
              style={[styles.ctaButton, { backgroundColor: Colors.primary }]}
              onPress={() => router.push("/(tabs)/post")}
            >
              <ThemedText style={styles.ctaText}>Share something →</ThemedText>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.feedContainer}>
          {posts.map((post, index) => (
            <Animated.View
              key={post.id}
              entering={FadeInDown.delay(Math.min(index * 50, 300))
                .duration(400)
                .springify()}
              style={[
                styles.postCard,
                {
                  backgroundColor:
                    colors.background === "#18181B"
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                  borderColor:
                    colors.background === "#18181B"
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <FeedItemRouter item={post} onDelete={handleDeletePost} />
            </Animated.View>
          ))}

          {/* Loading more indicator / Load more trigger */}
          {loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : hasMore ? (
            <Pressable style={styles.loadMoreButton} onPress={handleLoadMore}>
              <ThemedText style={[styles.loadMoreText, { color: Colors.primary }]}>
                Load more
              </ThemedText>
            </Pressable>
          ) : null}

          {/* Bottom spacer */}
          <View style={styles.bottomSpacer} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  feedContainer: {
    paddingHorizontal: 16,
  },
  postCard: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  ctaButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  ctaText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadMoreButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 40,
  },
});
