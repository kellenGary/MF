import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

export type ProfileTab = "activity" | "posts";

interface ProfileTabBarProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

const TABS: { key: ProfileTab; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: "activity", label: "Activity", icon: "library-music" },
  { key: "posts", label: "Posts", icon: "grid-view" },
];

export default function ProfileTabBar({ activeTab, onTabChange }: ProfileTabBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab]}
            onPress={() => onTabChange(tab.key)}
          >
            <MaterialIcons
              name={tab.icon}
              size={20}
              color={isActive ? Colors.primary : colors.mutedForeground}
            />
            <ThemedText
              style={[
                styles.tabLabel,
                {
                  color: isActive ? Colors.primary : colors.mutedForeground,
                  fontWeight: isActive ? "700" : "500",
                },
              ]}
            >
              {tab.label}
            </ThemedText>
            {isActive && (
              <View style={[styles.activeIndicator, { backgroundColor: Colors.primary }]} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 4,
    position: "relative",
  },
  tabLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2.5,
    borderRadius: 2,
  },
});
