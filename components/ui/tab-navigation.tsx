import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { Dispatch, SetStateAction } from "react";
import { Pressable, StyleSheet } from "react-native";

type TabType = string;

export default function TabNavigation({
  tabs,
  activeTab,
  setActiveTab,
}: {
  tabs: string[];
  activeTab: TabType;
  setActiveTab: Dispatch<SetStateAction<TabType>>;
}) {
  const { colors } = useTheme();

  return (
    <>
      {tabs.map((tab) => (
        <Pressable
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab, { borderBottomColor: Colors.primary }]}
          onPress={() => setActiveTab(tab)}
        >
          <ThemedText
            style={[styles.tabText, activeTab === tab && styles.activeTabText, { color: activeTab === tab ? Colors.primary : colors.text }]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </ThemedText>
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#538ce9ff",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#538ce9ff",
    fontWeight: "600",
  },
});
