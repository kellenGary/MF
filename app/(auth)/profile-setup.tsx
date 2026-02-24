import { ThemedText } from '@/components/ui/themed-text';
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { User } from "@/services/api";
import profileApi from "@/services/profileApi";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SpotifyProfile {
  display_name?: string;
  email?: string;
  images?: { url: string }[];
  id: string;
}

export default function ProfileSetupScreen() {
  const { colors } = useTheme();
  const { updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appProfile, setAppProfile] = useState<User | null>(null);
  const [spotifyProfile, setSpotifyProfile] = useState<SpotifyProfile | null>(
    null,
  );

  const [displayName, setDisplayName] = useState<string>("");
  const [handle, setHandle] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        const [sp, ap] = await Promise.all([
          profileApi.getProfile(),
          profileApi.getAppProfile(),
        ]);
        setSpotifyProfile(sp);
        setAppProfile(ap);

        const defaultDisplay = ap?.displayName ?? sp?.display_name ?? "";
        const defaultHandle =
          ap?.handle ??
          (sp?.display_name
            ? sp.display_name.replace(/\s+/g, "").toLowerCase()
            : "");
        setDisplayName(defaultDisplay);
        setHandle(defaultHandle);
        setBio(ap?.bio ?? "");
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSave() {
    try {
      const payload = { displayName, handle, bio };
      const updated = await profileApi.updateAppProfile(payload);
      if (updated) {
        // Update the user in auth context so routing works
        await updateUser(updated);
        Alert.alert("Profile updated", "Welcome!");
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      Alert.alert("Update failed", e?.message ?? "Please try again");
    }
  }

  const profileImage =
    spotifyProfile?.images?.[0]?.url ??
    appProfile?.profileImageUrl ??
    undefined;

  if (loading) {
    return (
      <View style={styles.center}>
        <ThemedText>Loading...</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText type="title" style={{ marginBottom: 8 }}>Set up your profile</ThemedText>
        <ThemedText type="small" style={{ color: colors.mutedForeground, marginBottom: 16 }}>
          We prefilled info from Spotify. Make it yours.
        </ThemedText>

        {profileImage && (
          <Image source={{ uri: profileImage }} style={styles.avatar} />
        )}

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Display Name</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Handle</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            placeholder="yourhandle"
            placeholderTextColor={colors.mutedForeground}
          />
          <ThemedText type="small" style={{ color: colors.mutedForeground, marginTop: 6 }}>
            Handles must be unique.
          </ThemedText>
        </View>

        <View style={styles.field}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Bio</ThemedText>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Tell us about your music taste"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <Pressable style={[styles.button, { backgroundColor: colors.accent }]} onPress={onSave}>
          <ThemedText type="defaultSemiBold" style={{ color: colors.accentForeground }}>Save and Continue</ThemedText>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    paddingHorizontal: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
    alignSelf: "center",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 8,
  },
});
