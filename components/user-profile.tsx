import AlbumItem from "@/components/album-item";
import PlaylistItem from "@/components/playlist-item";
import SongItem from "@/components/song-item";
import TabNavigation from "@/components/tab-navigation";
import { Colors, Fonts } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import followApi from "@/services/followApi";
import listeningHistoryApi from "@/services/listeningHistoryApi";
import profileApi from "@/services/profileApi";
import userDataApi from "@/services/userDataApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { RelativePathString, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabType = string;

const PAGE_SIZE = 50;

export default function UserProfile({ userId }: { userId?: number }) {
  const insets = useSafeAreaInsets();

  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [profileData, setProfileData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [playlistsData, setPlaylistsData] = useState<any>(null);
  const [likedSongsData, setLikedSongsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Follow state
  const [followCounts, setFollowCounts] = useState<{
    followers: number;
    following: number;
  }>({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Pagination state for each tab
  const [historyOffset, setHistoryOffset] = useState(0);
  const [likedOffset, setLikedOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [hasMoreLiked, setHasMoreLiked] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);

  // Determine if viewing own profile or another user's profile
  const isOwnProfile = !userId;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const groupConsecutiveAlbums = (items: any[]) => {
    if (!items || items.length === 0) return [];

    const grouped: any[] = [];
    let currentAlbumGroup: any = null;

    items.forEach((item, index) => {
      // Handle both enriched and non-enriched formats
      const track = item.track || item;
      const album = track.album;
      const albumId = album?.id;
      const hasAlbum = album != null;

      if (
        currentAlbumGroup &&
        currentAlbumGroup.albumId === albumId &&
        hasAlbum
      ) {
        // Add track to current album group
        currentAlbumGroup.tracks.push({
          id: track.id,
          name: track.name,
          artists: track.artists,
          played_at: item.played_at || item.playedAt,
        });
      } else {
        // Finalize previous group if it exists
        if (currentAlbumGroup) {
          grouped.push(currentAlbumGroup);
        }

        // Start new group
        currentAlbumGroup = {
          type: "album-group",
          albumId: albumId || null,
          albumName: album?.name || "Unknown Album",
          albumCover: album?.image_url || album?.images?.[0]?.url || "",
          artists: track.artists || [],
          tracks: [
            {
              id: track.id,
              name: track.name,
              artists: track.artists || [],
              played_at: item.played_at || item.playedAt,
            },
          ],
        };
      }
    });

    // Add final group
    if (currentAlbumGroup) {
      grouped.push(currentAlbumGroup);
    }

    return grouped;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#538ce9ff" />
        </View>
      );
    }

    switch (activeTab) {
      case "history":
        const groupedHistory = groupConsecutiveAlbums(historyData?.items || []);

        return (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recently Played
            </Text>
            {groupedHistory.map((group: any, index: number) => {
              if (group.tracks.length > 1) {
                // Multiple consecutive tracks from same album - show as album group
                return (
                  <AlbumItem
                    key={`album-group-${group.albumId}-${index}`}
                    group={group}
                  />
                );
              } else {
                // Single track - show as regular song item
                const track = group.tracks[0];
                return (
                  <SongItem
                    key={`${track.id}-${index}`}
                    id={track.id}
                    title={track.name}
                    artist={track.artists
                      .map((artist: any) => artist.name)
                      .join(", ")}
                    cover={group.albumCover}
                    link={`/song/${track.id}` as RelativePathString}
                  />
                );
              }
            })}
            {loadingMore && activeTab === "history" && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#538ce9ff" />
              </View>
            )}
            {!hasMoreHistory && historyData?.items?.length > 0 && (
              <Text style={[styles.endOfListText, { color: colors.text }]}>
                No more history to load
              </Text>
            )}
          </View>
        );
      case "playlists":
        return (
          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isOwnProfile ? "Your Playlists" : "Playlists"}
            </Text>
            {playlistsData?.items
              ?.filter((playlist: any) =>
                // For own profile, filter to show only owned playlists
                // For other users, show all playlists they have (could add owner filter based on their spotifyId)
                isOwnProfile
                  ? playlist.owner.id === profileData?.spotifyId
                  : true
              )
              .map((playlist: any) => (
                <PlaylistItem
                  key={playlist.id}
                  id={playlist.id}
                  name={playlist.name}
                  songCount={playlist.tracks?.total || 0}
                  cover={playlist.images[0]?.url || ""}
                  link={`/${"playlist"}/${playlist.id}` as RelativePathString}
                />
              ))}
          </View>
        );
      case "liked":
        return (
          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isOwnProfile ? "Liked Songs" : "Liked Songs"}
            </Text>
            {likedSongsData?.items?.map((item: any, index: number) => (
              <SongItem
                key={`${item.track.id}-${index}`}
                id={item.track.id}
                title={item.track.name}
                artist={item.track.artists
                  .map((artist: any) => artist.name)
                  .join(", ")}
                cover={item.track.album?.imageUrl || ""}
                link={`/song/${item.track.id}` as RelativePathString}
              />
            ))}
            {loadingMore && activeTab === "liked" && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#538ce9ff" />
              </View>
            )}
            {!hasMoreLiked && likedSongsData?.items?.length > 0 && (
              <Text style={[styles.endOfListText, { color: colors.text }]}>
                No more liked songs to load
              </Text>
            )}
          </View>
        );
    }
  };

  // Fetch profile data only when screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchProfileData = async () => {
        if (!isAuthenticated) return;
        try {
          const data = await profileApi.getAppProfile(userId);
          setProfileData(data);

          // Fetch follow counts for this profile
          const profileUserId = userId || data.id;
          if (profileUserId) {
            const counts = await followApi.getFollowCounts(profileUserId);
            setFollowCounts(counts);

            // If viewing another user's profile, check if we're following them
            if (userId) {
              const followStatus = await followApi.getFollowStatus(userId);
              setIsFollowing(followStatus);
            }
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      };

      fetchProfileData();
    }, [isAuthenticated, userId])
  );

  const handleToggleFollow = useCallback(async () => {
    if (!userId || followLoading) return;

    setFollowLoading(true);
    try {
      const newStatus = await followApi.toggleFollow(userId, isFollowing);
      setIsFollowing(newStatus);
      // Update follower count
      setFollowCounts((prev) => ({
        ...prev,
        followers: newStatus ? prev.followers + 1 : prev.followers - 1,
      }));
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    } finally {
      setFollowLoading(false);
    }
  }, [userId, isFollowing, followLoading]);

  const fetchHistory = useCallback(
    async (refresh = false) => {
      if (!isAuthenticated) return;

      const currentOffset = refresh ? 0 : historyOffset;
      if (refresh) {
        setRefreshing(true);
      } else if (currentOffset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await listeningHistoryApi.getEnrichedListeningHistory(
          PAGE_SIZE,
          currentOffset,
          userId // Pass userId for other users, undefined for current user
        );
        if (refresh || currentOffset === 0) {
          setHistoryData(data);
          setHistoryOffset(PAGE_SIZE);
        } else {
          setHistoryData((prev: any) => ({
            ...data,
            items: [...(prev?.items || []), ...(data?.items || [])],
          }));
          setHistoryOffset(currentOffset + PAGE_SIZE);
        }
        setHasMoreHistory((data?.items?.length || 0) >= PAGE_SIZE);
      } catch (error) {
        console.error("Failed to fetch listening history:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [isAuthenticated, historyOffset, userId]
  );

  const fetchPlaylists = useCallback(
    async (refresh = false) => {
      if (!isAuthenticated) return;
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const data = await userDataApi.getPlaylists(userId);
        setPlaylistsData(data);
      } catch (error) {
        console.error("Failed to fetch playlists:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated, userId]
  );

  const fetchLikedSongs = useCallback(
    async (refresh = false) => {
      if (!isAuthenticated) return;

      const currentOffset = refresh ? 0 : likedOffset;
      if (refresh) {
        setRefreshing(true);
      } else if (currentOffset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await userDataApi.getLikedTracks(
          PAGE_SIZE,
          currentOffset,
          userId
        );
        if (refresh || currentOffset === 0) {
          setLikedSongsData(data);
          setLikedOffset(PAGE_SIZE);
        } else {
          setLikedSongsData((prev: any) => ({
            ...data,
            items: [...(prev?.items || []), ...(data?.items || [])],
          }));
          setLikedOffset(currentOffset + PAGE_SIZE);
        }
        setHasMoreLiked((data?.items?.length || 0) >= PAGE_SIZE);
      } catch (error) {
        console.error("Failed to fetch liked songs:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [isAuthenticated, likedOffset, userId]
  );

  const onRefresh = useCallback(() => {
    switch (activeTab) {
      case "history":
        fetchHistory(true);
        break;
      case "playlists":
        fetchPlaylists(true);
        break;
      case "liked":
        fetchLikedSongs(true);
        break;
    }
  }, [activeTab, fetchHistory, fetchPlaylists, fetchLikedSongs]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading) return;

    switch (activeTab) {
      case "history":
        if (hasMoreHistory) fetchHistory(false);
        break;
      case "liked":
        if (hasMoreLiked) fetchLikedSongs(false);
        break;
      // Playlists don't have pagination in current implementation
    }
  }, [
    activeTab,
    loadingMore,
    loading,
    hasMoreHistory,
    hasMoreLiked,
    fetchHistory,
    fetchLikedSongs,
  ]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const paddingToBottom = 100;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;

      if (isCloseToBottom && !loadingMore && !loading) {
        loadMore();
      }
    },
    [loadMore, loadingMore, loading]
  );

  // Reset data when userId changes (navigating to different profile)
  useEffect(() => {
    setProfileData(null);
    setHistoryData(null);
    setPlaylistsData(null);
    setLikedSongsData(null);
    setHistoryOffset(0);
    setLikedOffset(0);
    setHasMoreHistory(true);
    setHasMoreLiked(true);
    setActiveTab("history");
    setFollowCounts({ followers: 0, following: 0 });
    setIsFollowing(false);
  }, [userId]);

  // Initial data load when tab changes (only if data not already loaded)
  useEffect(() => {
    switch (activeTab) {
      case "history":
        if (!historyData) {
          setHistoryOffset(0);
          setHasMoreHistory(true);
          fetchHistory(false);
        }
        break;
      case "playlists":
        if (!playlistsData) fetchPlaylists(false);
        break;
      case "liked":
        if (!likedSongsData) {
          setLikedOffset(0);
          setHasMoreLiked(true);
          fetchLikedSongs(false);
        }
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={["#538ce9ff"]}
          />
        }
      >
        <View style={styles.headerContainer}>
          {/* Header Actions */}
          <View style={styles.headerActions}>
            {/* Back button for other users' profiles */}
            {!isOwnProfile ? (
              <Pressable
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color={colors.icon}
                />
              </Pressable>
            ) : (
              <View style={styles.spacer} />
            )}
            {/* Settings button only for own profile */}
            {isOwnProfile ? (
              <>
                <Pressable
                  style={styles.mapButton}
                  onPress={() => router.push("/listening-map")}
                >
                  <MaterialIcons
                    name="map"
                    size={24}
                    color={colors.icon}
                  />
                </Pressable>
                <Pressable
                  style={styles.settingsButton}
                  onPress={() => router.push("/(settings)")}
                >
                  <MaterialIcons
                    name="settings"
                    size={24}
                    color={colors.icon}
                  />
                </Pressable>
              </>
            ) : (
              <View style={styles.spacer} />
            )}
          </View>

          {/* Profile Picture */}
          <View style={{ alignItems: "center" }}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: profileData ? profileData.profileImageUrl : "" }}
                style={styles.profileImage}
              />
            </View>

            {/* Name & Username */}
            <Text style={[styles.profileName, { color: colors.text }]}>
              {profileData ? profileData.displayName : "Unknown"}
            </Text>
            <Text style={{ color: colors.text }}>
              {profileData ? profileData.handle : "unknown"}
            </Text>

            {/* Follow Button for other users' profiles */}
            {!isOwnProfile && (
              <Pressable
                style={[
                  styles.profileFollowButton,
                  {
                    backgroundColor: isFollowing ? "transparent" : colors.tint,
                    borderWidth: isFollowing ? 1 : 0,
                    borderColor: colors.tint,
                  },
                ]}
                onPress={handleToggleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={!isFollowing ? Colors.light.text : "#fff"}
                  />
                ) : (
                  <Text
                    style={[
                      styles.profileFollowButtonText,
                      { color: !isFollowing ? Colors.light.text : "#fff" },
                    ]}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <Pressable style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {formatNumber(followCounts.followers)}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text, opacity: 0.7 }]}
              >
                Followers
              </Text>
            </Pressable>
            <Pressable style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {formatNumber(followCounts.following)}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text, opacity: 0.7 }]}
              >
                Following
              </Text>
            </Pressable>
            <Pressable style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {formatNumber(0)}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text, opacity: 0.7 }]}
              >
                Unique Songs
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TabNavigation
            tabs={["history", "playlists", "liked"]}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>{renderContent()}</View>
      </ScrollView>
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
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
  },
  spacer: {
    width: 40,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImageContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: Fonts.rounded,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    marginBottom: 20,
  },
  profileFollowButton: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  profileFollowButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: Fonts.rounded,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  contentContainer: {
    flex: 1,
    minHeight: 400,
  },
  contentSection: {},
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: Fonts.rounded,
    marginBottom: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  endOfListText: {
    textAlign: "center",
    paddingVertical: 20,
    opacity: 0.5,
    fontSize: 14,
  },
});
