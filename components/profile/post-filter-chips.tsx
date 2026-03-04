import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { PostType } from "@/services/feedApi";
import React from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";

export type PostFilterType = "All" | "Shared" | "Sessions" | "Likes" | "Reposts";

interface PostFilterChipsProps {
  activeFilter: PostFilterType;
  onFilterChange: (filter: PostFilterType) => void;
}

const FILTERS: { key: PostFilterType; label: string }[] = [
  { key: "All", label: "All" },
  { key: "Shared", label: "Shared" },
  { key: "Sessions", label: "Sessions" },
  { key: "Likes", label: "Likes" },
  { key: "Reposts", label: "Reposts" },
];

/**
 * Maps a filter chip selection to the PostType(s) the API understands.
 * Returns undefined for "All" (no filtering).
 */
export function getPostTypeForFilter(filter: PostFilterType): PostType | undefined {
  switch (filter) {
    case "Shared":
      return "SharedTrack"; // API will return all shared types when we pass this
    case "Sessions":
      return "ListeningSession";
    case "Likes":
      return "LikedTrack";
    case "Reposts":
      return "Repost";
    case "All":
    default:
      return undefined;
  }
}

export default function PostFilterChips({ activeFilter, onFilterChange }: PostFilterChipsProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.key;
        return (
          <Pressable
            key={filter.key}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? Colors.primary : "transparent",
                borderColor: isActive ? Colors.primary : colors.border,
              },
            ]}
            onPress={() => onFilterChange(filter.key)}
          >
            <ThemedText
              style={[
                styles.chipLabel,
                {
                  color: isActive ? "#FFFFFF" : colors.mutedForeground,
                  fontWeight: isActive ? "600" : "400",
                },
              ]}
            >
              {filter.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
  },
});
