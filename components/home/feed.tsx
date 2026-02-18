import FeedItemRouter from "@/components/ui/posts/feed-item-router";
import { useScrollContext } from "@/contexts/ScrollContext";
import { useTheme } from "@/contexts/ThemeContext";
import useFeed from "@/hooks/useFeed";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { ThemedText } from "../ui/themed-text";

type FeedProps = {
  ListHeaderComponent?: React.ReactNode | null;
};

export default function Feed({ ListHeaderComponent = null }: FeedProps) {
  const { feedPosts, feedLoading, refreshing, handleRefresh, handleLoadMore, handleDeletePost } =
    useFeed();
  const { collapse } = useScrollContext();
  const { colors } = useTheme();

  const handleScrollBeginDrag = useCallback(() => {
    collapse();
  }, [collapse]);

  const renderFooter = () => {
    if (!feedLoading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={[styles.emptyIconWrap]}>
        <Ionicons name="compass-outline" size={48} color={colors.mutedForeground} />
      </View>
      <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
        Your feed is empty
      </ThemedText>
      <ThemedText
        type="small"
        style={{ color: colors.mutedForeground, textAlign: "center", marginBottom: 16 }}
      >
        Follow some people to see their posts here.{"\n"}
        Discover new friends on the Explore page!
      </ThemedText>
      <Pressable
        style={[styles.emptyButton, { backgroundColor: colors.accent }]}
        onPress={() => router.push("/(tabs)/explore")}
      >
        <Ionicons name="search" size={18} color={colors.accentForeground} />
        <ThemedText type="defaultSemiBold" style={{ color: colors.accentForeground }}>
          Explore
        </ThemedText>
      </Pressable>
    </View>
  );

  return (
    <FlatList
      data={feedPosts}
      renderItem={({ item }) => <FeedItemRouter item={item} onDelete={handleDeletePost} />}
      keyExtractor={(item: any) => `${item.type}-${item.id}-${item.createdAt}`}
      ListHeaderComponent={() => <>{ListHeaderComponent}</>}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.text}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      onScrollBeginDrag={handleScrollBeginDrag}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 64,
    paddingHorizontal: 16,
    gap: 12,
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  empty: {
    paddingVertical: 64,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
});
