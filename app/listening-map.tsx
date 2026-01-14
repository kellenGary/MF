import { Colors, Fonts } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import listeningHistoryApi, {
    LocationHistoryEntry,
} from "@/services/listeningHistoryApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ListeningMapScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [locationError, setLocationError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<LocationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarker, setSelectedMarker] =
    useState<LocationHistoryEntry | null>(null);
  const [region, setRegion] = useState<Region | null>(null);

  // Get user's current location for initial map center
  useEffect(() => {
    async function getCurrentLocation() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Permission to access location was denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }

    getCurrentLocation();
  }, []);

  // Fetch listening history with location data
  const fetchLocationHistory = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const data = await listeningHistoryApi.getListeningHistoryWithLocation(
        500,
        0
      );
      setHistoryItems(data.items);

      // If we have history items but no user location, center on first item
      if (data.items.length > 0 && !region) {
        setRegion({
          latitude: data.items[0].latitude,
          longitude: data.items[0].longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }
    } catch (error) {
      console.error("Failed to fetch location history:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, region]);

  useEffect(() => {
    fetchLocationHistory();
  }, [fetchLocationHistory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !region) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading your listening map...
        </Text>
      </View>
    );
  }

  if (locationError && historyItems.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.errorContainer,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.icon} />
        </Pressable>
        <Text style={[styles.errorText, { color: colors.text }]}>
          {locationError}
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.text }]}>
          Enable location permissions to see your listening map
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Listening Map</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Map */}
      {region && (
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation
          showsMyLocationButton
          userInterfaceStyle={isDark ? "dark" : "light"}
        >
          {historyItems.map((item) => (
            <Marker
              key={item.id}
              coordinate={{
                latitude: item.latitude,
                longitude: item.longitude,
              }}
              onPress={() => setSelectedMarker(item)}
            >
              <View style={styles.markerContainer}>
                {item.track.album?.image_url ? (
                  <Image
                    source={{ uri: item.track.album.image_url }}
                    style={styles.markerImage}
                  />
                ) : (
                  <View style={styles.markerPlaceholder}>
                    <MaterialIcons name="music-note" size={16} color="#fff" />
                  </View>
                )}
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Stats overlay */}
      <View style={[styles.statsOverlay, { bottom: insets.bottom + 16 }]}>
        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statsNumber, { color: colors.text }]}>
            {historyItems.length}
          </Text>
          <Text style={[styles.statsLabel, { color: colors.text }]}>
            Tracked Listens
          </Text>
        </View>
      </View>

      {/* Selected marker modal */}
      <Modal
        visible={selectedMarker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMarker(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedMarker(null)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            {selectedMarker && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.trackInfo}>
                  {selectedMarker.track.album?.image_url ? (
                    <Image
                      source={{ uri: selectedMarker.track.album.image_url }}
                      style={styles.trackImage}
                    />
                  ) : (
                    <View style={[styles.trackImage, styles.trackImagePlaceholder]}>
                      <MaterialIcons name="music-note" size={32} color="#fff" />
                    </View>
                  )}
                  <View style={styles.trackDetails}>
                    <Text
                      style={[styles.trackName, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {selectedMarker.track.name}
                    </Text>
                    <Text
                      style={[styles.trackArtist, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {selectedMarker.track.artists
                        .map((a) => a.name)
                        .join(", ")}
                    </Text>
                    <Text style={[styles.trackDate, { color: colors.text }]}>
                      {formatDate(selectedMarker.played_at)}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={[styles.viewTrackButton, { backgroundColor: colors.tint }]}
                  onPress={() => {
                    setSelectedMarker(null);
                    router.push(`/song/${selectedMarker.track.id}` as any);
                  }}
                >
                  <Text style={styles.viewTrackButtonText}>View Track</Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
  },
  errorSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Fonts.rounded,
    color: "#fff",
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerImage: {
    width: "100%",
    height: "100%",
  },
  markerPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#538ce9",
    justifyContent: "center",
    alignItems: "center",
  },
  statsOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  statsCard: {
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: Fonts.rounded,
  },
  statsLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(128,128,128,0.4)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  trackInfo: {
    flexDirection: "row",
    gap: 16,
  },
  trackImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  trackImagePlaceholder: {
    backgroundColor: "#538ce9",
    justifyContent: "center",
    alignItems: "center",
  },
  trackDetails: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  trackName: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Fonts.rounded,
  },
  trackArtist: {
    fontSize: 14,
    opacity: 0.8,
  },
  trackDate: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  viewTrackButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  viewTrackButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
});
