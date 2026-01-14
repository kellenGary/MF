import { useAuth } from "@/contexts/AuthContext";
import feedApi, { FeedPost } from "@/services/feedApi";
import { useCallback, useEffect, useState } from "react";

export default function useFeed() {
  const { isAuthenticated } = useAuth();
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedOffset, setFeedOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  const fetchFeedPosts = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) return;

    try {
      const offset = isRefresh ? 0 : feedOffset;
      const response = await feedApi.getFeed(20, offset);

      const keyFor = (p: FeedPost) => `${p.type}-${p.id}-${p.createdAt}`;

      if (isRefresh) {
        setFeedPosts(response.items);
        setFeedOffset(response.items.length);
        setHasMorePosts(response.items.length < response.total);
      } else {
        setFeedPosts(prev => {
          const map = new Map<string, FeedPost>();
          for (const p of prev) map.set(keyFor(p), p);
          for (const p of response.items) map.set(keyFor(p), p);
          return Array.from(map.values());
        });
        setFeedOffset(prev => prev + response.items.length);
        setHasMorePosts((feedPosts.length + response.items.length) < response.total);
      }
    } catch (error) {
      console.error("Error fetching feed posts:", error);
    }
  }, [isAuthenticated, feedOffset, feedPosts.length]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFeedPosts(true);
    setRefreshing(false);
  }, [fetchFeedPosts]);

  const handleLoadMore = useCallback(() => {
    if (!feedLoading && hasMorePosts) {
      setFeedLoading(true);
      fetchFeedPosts(false).finally(() => setFeedLoading(false));
    }
  }, [feedLoading, hasMorePosts, fetchFeedPosts]);

  useEffect(() => {
    fetchFeedPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return {
    feedPosts,
    feedLoading,
    refreshing,
    handleRefresh,
    handleLoadMore,
    hasMorePosts,
  } as const;
}
