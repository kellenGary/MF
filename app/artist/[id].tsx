import { ThemedText } from '@/components/ui/themed-text';
import TrackList, { ListItem } from '@/components/ui/track-list';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import artistApi, { Album, Artist } from "@/services/artistApi";

import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ArtistScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [artist, setArtist] = useState<Artist | null>(null);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  useEffect(() => {
    if (!id) return;

    async function fetchArtistData() {
      setLoading(true);
      setError(null);
      try {
        const [artistData, albumsData] = await Promise.all([
          artistApi.getArtist(id as string),
          artistApi.getArtistAlbums(id as string),
        ]);
        setArtist(artistData);
        setAlbums(albumsData.items || []);
      } catch (err) {
        console.error("Error fetching artist data:", err);
        setError("Failed to load artist");
      } finally {
        setLoading(false);
      }
    }

    fetchArtistData();
  }, [id]);

  const handleAlbumPress = useCallback((item: ListItem) => {
    router.push(`/album/${item.id}` as any);
  }, []);

  const albumListItems: ListItem[] = useMemo(
    () =>
      albums.map((album) => ({
        id: album.id,
        name: album.name,
        subtitle: `${album.release_date?.split("-")[0] || ""} • ${album.album_type || ""}`,
        imageUrl: album.images?.[1]?.url || album.images?.[0]?.url || null,
        type: "album" as const,
      })),
    [albums],
  );

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      />
    );
  }

  if (error || !artist) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <MaterialIcons name="person-off" size={48} color={colors.icon} />
        <ThemedText style={[styles.errorText, { color: colors.text }]}>
          {error || "Artist not found"}
        </ThemedText>
      </View>
    );
  }

  const artistImage = artist.images?.[0]?.url;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: artist.name, headerShown: false }} />

      {/* Artist Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: artistImage || "" }}
          style={styles.artistImage}
          contentFit="cover"
        />
        <ThemedText type='subtitle'>
          {artist.name}
        </ThemedText>
        {artist.genres?.length > 0 && (
          <ThemedText type='small' style={[styles.genres, { color: colors.icon }]}>
            {artist.genres.slice(0, 3).join(" • ")}
          </ThemedText>
        )}
      </View>

      {/* Albums Section */}
      {albums.length > 0 && (
        <View style={styles.section}>
          <ThemedText type='defaultSemiBold' style={[styles.sectionTitle, { color: colors.text }]}>
            Albums & Singles
          </ThemedText>
          <TrackList
            items={albumListItems}
            onItemPress={handleAlbumPress}
            flatListProps={{
              scrollEnabled: false,
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  artistImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 16,
  },
  artistName: {
    textAlign: "center",
  },
  genres: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
});

