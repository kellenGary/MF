import { useAuth } from "@/contexts/AuthContext";
import { RelativePathString, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsPage() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const handleSignout = async () => {
    await signOut();
    // Ensure we can't navigate back to a protected screen
    router.replace("/(auth)");
  };

  const handleEditProfile = () => {
    router.push("/profile-editor" as RelativePathString);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.icon} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      {/* Settings options */}
      <Pressable style={styles.logoutButton} onPress={() => handleSignout()}>
        <Text style={{ color: "#fff" }}>Sign out</Text>
      </Pressable>
      <Pressable
        style={styles.logoutButton}
        onPress={() => handleEditProfile()}
      >
        <Text style={{ color: "#fff" }}>Edit Profile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: "#ffe6e6",
    padding: 10,
    marginTop: 12,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  headerRight: {
    width: 64,
    alignItems: "flex-end",
  },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  saveText: {
    fontWeight: "600",
  },
  logoutButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#ff4444",
    borderRadius: 5,
    marginRight: "auto",
  },
});
