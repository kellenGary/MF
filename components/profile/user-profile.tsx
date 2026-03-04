import { useAuth } from "@/contexts/AuthContext";
import { useScrollContext } from "@/contexts/ScrollContext";
import { useTheme } from "@/contexts/ThemeContext";
import useTrackStreaks from "@/hooks/useTrackStreaks";
import useUserContent from "@/hooks/useUserContent";
import profileApi, { CompatibilityResult, ProfileData } from "@/services/profileApi";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CompatibilityScore from "./compatibility-score";
import ProfileContent from "./profile-content";
import ProfileHeader from "./profile-header";
import ProfileStats from "./profile-stats";
import { ThemedText } from "@/components/ui/themed-text";

const PAGE_SIZE = 50;

export interface AlbumGroup {
  type: "album-group";
  albumId: string | null;
  albumSpotifyId: string | null;
  albumName: string;
  albumCover: string;
  artists: any[];
  tracks: {
    id: string;
    spotifyId: string;
    name: string;
    artists: any[];
    played_at: string;
  }[];
}

interface UserProfileProps {
  userId?: number;
}

/**
 * Main user profile component.
 * If `userId` prop is provided, shows that user's profile; otherwise shows current user's profile.
 */
export default function UserProfile({ userId }: UserProfileProps) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, profileData: cachedProfileData, user, refreshCurrentUser } = useAuth();
  const { collapse } = useScrollContext();
  const { colors } = useTheme();

  // Profile-specific state
  const [profileData, setProfileData] = useState<ProfileData | null>(userId ? null : cachedProfileData);
  const [refreshing, setRefreshing] = useState(false);
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });

  const [compatibility, setCompatibility] = useState<CompatibilityResult | null>(null);
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const isOwnProfile = !userId;

  // Use the shared content hook for data fetching
  const {
    topArtists,
    recentTracks,
    likedTracks,
    likedAlbums,
    playlists,
    followedArtists,
    loading: contentLoading,
    pagination,
    sotd,
    fetchTopArtists,
    fetchRecentTracks,
    fetchLikedTracks,
    fetchLikedAlbums,
    fetchPlaylists,
    fetchFollowedArtists,
    fetchSotd,
    resetPagination,
  } = useUserContent(userId);

  // Track streaks
  const effectiveUserId = userId ?? profileData?.id;
  const { getStreak } = useTrackStreaks(effectiveUserId);

  // === Utility Functions ===

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const groupConsecutiveAlbums = (items: any[]): AlbumGroup[] => {
    if (!items || items.length === 0) return [];

    const grouped: AlbumGroup[] = [];
    let currentAlbumGroup: AlbumGroup | null = null;

    items.forEach((item) => {
      const track = item.track || item;
      const album = track.album;
      const albumId = album?.id;
      const hasAlbum = album != null;

      if (
        currentAlbumGroup &&
        currentAlbumGroup.albumId === albumId &&
        hasAlbum
      ) {
        currentAlbumGroup.tracks.push({
          id: track.id,
          spotifyId: track.spotify_id,
          name: track.name,
          artists: track.artists,
          played_at: item.played_at || item.playedAt,
        });
      } else {
        if (currentAlbumGroup) {
          grouped.push(currentAlbumGroup);
        }

        currentAlbumGroup = {
          type: "album-group",
          albumId: albumId || null,
          albumSpotifyId: album?.spotifyId || album?.spotify_id || null,
          albumName: album?.name || "Unknown Album",
          albumCover: album?.image_url || album?.images?.[0]?.url || "",
          artists: track.artists || [],
          tracks: [
            {
              id: track.id,
              spotifyId: track.spotify_id,
              name: track.name,
              artists: track.artists || [],
              played_at: item.played_at || item.playedAt,
            },
          ],
        };
      }
    });

    if (currentAlbumGroup) {
      grouped.push(currentAlbumGroup);
    }

    return grouped;
  };

  const handleFollowChange = useCallback((isFollowing: boolean) => {
    setFollowCounts((prev) => ({
      ...prev,
      followers: isFollowing ? prev.followers + 1 : prev.followers - 1,
    }));
  }, []);

  // Fetch profile data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchProfileData = async () => {
        if (!isAuthenticated) return;
        try {
          const data = await profileApi.getAppProfile(userId);
          setProfileData(data);
          setFollowCounts({
            followers: data.totalFollowers,
            following: data.totalFollowing,
          });
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      };

      fetchProfileData();

      // Fetch compatibility score for other users' profiles
      if (userId) {
        setCompatibilityLoading(true);
        profileApi.getCompatibility(userId)
          .then(setCompatibility)
          .catch(() => setCompatibility(null))
          .finally(() => setCompatibilityLoading(false));
      }

      fetchRecentTracks(PAGE_SIZE, 0, true).catch(() => { });
      fetchLikedTracks(PAGE_SIZE, 0, true).catch(() => { });
      fetchLikedAlbums(PAGE_SIZE, 0, true).catch(() => { });
      fetchPlaylists(true).catch(() => { });
      fetchFollowedArtists(PAGE_SIZE, 0, true).catch(() => { });
      fetchTopArtists(true).catch(() => { });
      fetchSotd().catch(() => { });
    }, [isAuthenticated, userId]),
  );

  // Reset data when userId changes
  useEffect(() => {
    setProfileData(userId ? null : cachedProfileData);
    setFollowCounts({ followers: 0, following: 0 });
    resetPagination();
  }, [userId, resetPagination, cachedProfileData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (userId && !isAuthenticated) return;

      // Re-check sync status if looking at own profile
      if (isOwnProfile) {
        await refreshCurrentUser();
      }

      const fetchProfileData = async () => {
        if (!isAuthenticated) return;
        try {
          const data = await profileApi.getAppProfile(userId);
          setProfileData(data);
          setFollowCounts({
            followers: data.totalFollowers,
            following: data.totalFollowing,
          });
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      };

      await Promise.all([
        fetchProfileData(),
        fetchRecentTracks(PAGE_SIZE, 0, true),
        fetchLikedTracks(PAGE_SIZE, 0, true),
        fetchLikedAlbums(PAGE_SIZE, 0, true),
        fetchPlaylists(true),
        fetchFollowedArtists(PAGE_SIZE, 0, true),
        fetchTopArtists(true),
        fetchSotd()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    userId,
    isAuthenticated,
    isOwnProfile,
    refreshCurrentUser,
    fetchRecentTracks,
    fetchLikedTracks,
    fetchLikedAlbums,
    fetchPlaylists,
    fetchFollowedArtists,
    fetchTopArtists,
    fetchSotd
  ]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        { backgroundColor: colors.background },
      ]}
    >
      {isOwnProfile && user && !user.isInitialSyncComplete ? (
        <View style={styles.syncingContainer}>
          <ActivityIndicator size="large" color={colors.mutedForeground} />
          <ThemedText type="defaultSemiBold" style={styles.syncingTitle}>
            Syncing your Spotify data
          </ThemedText>
          <ThemedText type="small" style={[styles.syncingSubtitle, { color: colors.mutedForeground }]}>
            We're importing your music library. Come back soon — your profile will be ready shortly.
          </ThemedText>
        </View>
      ) : (
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={400}
        onScrollBeginDrag={collapse}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text}
            colors={["#538ce9ff"]}
          />
        }
      >
        <View style={styles.headerContainer}>
          <ProfileHeader
            profileData={profileData}
            isOwnProfile={isOwnProfile}
            sotd={sotd}
            userId={userId}
            onFollowChange={handleFollowChange}
          />

          <ProfileStats
            followCounts={followCounts}
            profileData={profileData}
            topArtists={topArtists}
            formatNumber={formatNumber}
            userId={effectiveUserId}
          />
        </View>

        {/* Compatibility Score — only on other users' profiles */}
        {!isOwnProfile && (
          <CompatibilityScore
            compatibility={compatibility}
            loading={compatibilityLoading}
          />
        )}

        <ProfileContent
          loading={false}
          contentLoading={contentLoading}
          recentTracks={recentTracks}
          likedTracks={likedTracks}
          likedAlbums={likedAlbums}
          playlists={playlists}
          followedArtists={followedArtists}
          isOwnProfile={isOwnProfile}
          spotifyId={profileData?.spotifyId}
          onLoadMoreLikedTracks={() => {
            if (pagination.likedTracks.hasMore && !contentLoading.tracks) {
              fetchLikedTracks(PAGE_SIZE, likedTracks.length);
            }
          }}
          onLoadMoreLikedAlbums={() => {
            if (pagination.likedAlbums.hasMore && !contentLoading.albums) {
              fetchLikedAlbums(PAGE_SIZE, likedAlbums.length);
            }
          }}
          onLoadMoreFollowedArtists={() => {
            if (pagination.followedArtists.hasMore && !contentLoading.artists) {
              fetchFollowedArtists(PAGE_SIZE, followedArtists.length);
            }
          }}
        />
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: 24,
    alignItems: "center",
    gap: 8,
  },
  syncingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  syncingTitle: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 8,
  },
  syncingSubtitle: {
    textAlign: "center",
    lineHeight: 22,
  },
});
