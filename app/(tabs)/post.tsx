import FilterBubble from "@/components/ui/filter-bubble";
import SearchBar from "@/components/ui/search-bar";
import SelectableItem from "@/components/ui/selectable-item";
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useUserContent from "@/hooks/useUserContent";
import { SelectedContent } from "@/services/postApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_SIZE = 50;

export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const { isAuthenticated } = useAuth();

  const filters = ["Recent", "Liked", "Albums", "Playlists", "Artists"];
  const [activeFilter, setActiveFilter] = useState("Recent");
  const [searchQuery, setSearchQuery] = useState("");

  // Data provided by shared hook
  const {
    recentTracks,
    likedTracks,
    likedAlbums,
    playlists: userPlaylists,
    followedArtists,
    loading,
    fetchRecentTracks,
    fetchLikedTracks,
    fetchLikedAlbums,
    fetchPlaylists,
    fetchFollowedArtists,
    searchItems,
  } = useUserContent();

  // Selection state
  const [selectedContent, setSelectedContent] =
    useState<SelectedContent | null>(null);

  // combined loading flag
  const isLoading =
    loading.tracks || loading.albums || loading.playlists || loading.artists;

  // Fetch data when filter changes
  useMemo(() => {
    if (!isAuthenticated) return;
    setSelectedContent(null); // Clear selection when filter changes
    setSearchQuery(""); // Clear search

    switch (activeFilter) {
      case "Recent":
        fetchRecentTracks(PAGE_SIZE, 0);
        break;
      case "Liked":
        fetchLikedTracks(PAGE_SIZE, 0);
        break;
      case "Albums":
        fetchLikedAlbums(PAGE_SIZE, 0);
        break;
      case "Playlists":
        fetchPlaylists();
        break;
      case "Artists":
        fetchFollowedArtists(PAGE_SIZE, 0);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, isAuthenticated]);

  // Initial fetch
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchLikedTracks(PAGE_SIZE, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleSelect = (content: SelectedContent) => {
    if (
      selectedContent?.id === content.id &&
      selectedContent?.type === content.type
    ) {
      setSelectedContent(null);
    } else {
      setSelectedContent(content);
    }
  };

  const handleContinue = () => {
    if (!selectedContent) return;

    router.push({
      pathname: "/post-preview",
      params: {
        type: selectedContent.type,
        id: selectedContent.id,
        spotifyId: selectedContent.spotifyId,
        name: selectedContent.name,
        imageUrl: selectedContent.imageUrl || "",
        subtitle: selectedContent.subtitle,
      },
    });
  };

  // Deduplicate items by a key selector, keeping the first (most recent) occurrence
  const dedupe = <T,>(items: T[], getKey: (item: T) => string | number): T[] => {
    const seen = new Set<string | number>();
    return items.filter((item) => {
      const key = getKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const EmptyState = ({ message, icon }: { message: string, icon: keyof typeof MaterialIcons.glyphMap }) => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name={icon} size={64} color={colors.text} style={styles.emptyIcon} />
      <ThemedText style={[styles.emptyText, { color: colors.text }]}>
        {message}
      </ThemedText>
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <ThemedText style={[styles.loadingText, { color: colors.text }]}>
            Loading your {activeFilter.toLowerCase()}s...
          </ThemedText>
        </View>
      );
    }

    switch (activeFilter) {
      case "Recent":
        const filteredSongs = dedupe(
          searchItems(recentTracks, ["name", "artistNames"], searchQuery),
          (t: any) => t.id
        );
        return filteredSongs.length > 0 ? (
          filteredSongs.map((track: any, index: number) => {
            const content: SelectedContent = {
              type: "song",
              id: track.id,
              spotifyId: track.spotifyId || track.id,
              name: track.name,
              imageUrl: track.albumImageUrl || null,
              subtitle: track.artistNames?.join(", ") || "Unknown Artist",
            };
            return (
              <SelectableItem
                key={`song-${track.id}-${index}`}
                id={track.id}
                title={track.name}
                subtitle={content.subtitle}
                imageUrl={content.imageUrl}
                isSelected={
                  selectedContent?.id === content.id &&
                  selectedContent?.type === "song"
                }
                onSelect={() => handleSelect(content)}
              />
            );
          })
        ) : (
          <EmptyState message="No recent songs found" icon="history" />
        );
      case "Liked":
        const filteredLikedSongs = dedupe(
          searchItems(likedTracks, ["name", "artistNames"], searchQuery),
          (t: any) => t.id
        );
        return filteredLikedSongs.length > 0 ? (
          filteredLikedSongs.map((track: any, index: number) => {
            const content: SelectedContent = {
              type: "song",
              id: track.id,
              spotifyId: track.spotifyId || track.id,
              name: track.name,
              imageUrl: track.albumImageUrl || null,
              subtitle: track.artistNames?.join(", ") || "Unknown Artist",
            };
            return (
              <SelectableItem
                key={`liked-song-${track.id}-${index}`}
                id={track.id}
                title={track.name}
                subtitle={content.subtitle}
                imageUrl={content.imageUrl}
                isSelected={
                  selectedContent?.id === content.id &&
                  selectedContent?.type === "song"
                }
                onSelect={() => handleSelect(content)}
              />
            );
          })
        ) : (
          <EmptyState message="No liked songs found" icon="favorite-border" />
        );

      case "Albums":
        const filteredAlbums = dedupe(
          searchItems(likedAlbums, ["album.name"], searchQuery),
          (item: any) => item.album.id
        );
        return filteredAlbums.length > 0 ? (
          filteredAlbums.map((item: any, index: number) => {
            const album = item.album;
            const content: SelectedContent = {
              type: "album",
              id: album.id,
              spotifyId: album.id,
              name: album.name,
              imageUrl: album.imageUrl || null,
              subtitle: album.albumType
                ? `${album.albumType} • ${album.totalTracks || 0} tracks`
                : `${album.totalTracks || 0} tracks`,
            };
            return (
              <SelectableItem
                key={`album-${album.id}-${index}`}
                id={album.id}
                title={album.name}
                subtitle={content.subtitle}
                imageUrl={content.imageUrl}
                isSelected={
                  selectedContent?.id === content.id &&
                  selectedContent?.type === "album"
                }
                onSelect={() => handleSelect(content)}
              />
            );
          })
        ) : (
          <EmptyState message="No liked albums found" icon="album" />
        );

      case "Playlists":
        const filteredPlaylists = dedupe(
          searchItems(userPlaylists, ["name"], searchQuery),
          (p: any) => p.id
        );
        return filteredPlaylists.length > 0 ? (
          filteredPlaylists.map((playlist: any, index: number) => {
            const content: SelectedContent = {
              type: "playlist",
              id: playlist.id,
              spotifyId: playlist.id,
              name: playlist.name,
              imageUrl: playlist.images?.[0]?.url || null,
              subtitle: `${playlist.tracks?.total || 0} songs`,
            };
            return (
              <SelectableItem
                key={`playlist-${playlist.id}-${index}`}
                id={playlist.id}
                title={playlist.name}
                subtitle={content.subtitle}
                imageUrl={content.imageUrl}
                isSelected={
                  selectedContent?.id === content.id &&
                  selectedContent?.type === "playlist"
                }
                onSelect={() => handleSelect(content)}
              />
            );
          })
        ) : (
          <EmptyState message="No playlists found" icon="playlist-play" />
        );

      case "Artists":
        const filteredArtists = dedupe(
          searchItems(followedArtists, ["artist.name"], searchQuery),
          (item: any) => item.artist.id
        );
        return filteredArtists.length > 0 ? (
          filteredArtists.map((item: any, index: number) => {
            const artist = item.artist;
            const content: SelectedContent = {
              type: "artist",
              id: artist.id,
              spotifyId: artist.id,
              name: artist.name,
              imageUrl: artist.imageUrl || null,
              subtitle: "Artist",
            };
            return (
              <SelectableItem
                key={`artist-${artist.id}-${index}`}
                id={artist.id}
                title={artist.name}
                subtitle={content.subtitle}
                imageUrl={content.imageUrl}
                isSelected={
                  selectedContent?.id === content.id &&
                  selectedContent?.type === "artist"
                }
                onSelect={() => handleSelect(content)}
              />
            );
          })
        ) : (
          <EmptyState message="No followed artists found" icon="person-outline" />
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText type="title">Make a Post</ThemedText>
        {/* Continue Button */}
        {selectedContent && (
          <View style={[styles.bottomBar]}>
            <Pressable
              style={[
                styles.continueButton,
                { backgroundColor: Colors.primary },
              ]}
              onPress={handleContinue}
            >
              <MaterialIcons name="arrow-forward" size={20} color="white" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={`Search ${activeFilter.toLowerCase()}s...`}
        containerStyle={{
          marginVertical: 12,
          marginHorizontal: 16,
        }}
      />

      {/* Filter Bubbles */}
      <View style={styles.filtersContainer}>
        {filters.map((filter) => (
          <FilterBubble
            key={filter}
            filterName={filter}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />
        ))}
      </View>



      {/* Content List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  filtersContainer: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginLeft: 4,
  },

  listContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  emptyIcon: {
    opacity: 0.5,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  bottomBar: {
    backgroundColor: "transparent",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    borderRadius: 50,
    gap: 8,
  },
  continueButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
});
