import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/contexts/ThemeContext";
import { Image } from "expo-image";
import React, { useCallback } from "react";
import {
    ActivityIndicator,
    FlatList,
    FlatListProps,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

/** The kind of entity the item represents — controls image shape and badge text. */
export type ItemType = "song" | "album" | "artist" | "playlist" | "user";

export interface ListItem {
    /** Unique key for the item */
    id: string;
    /** Primary display name */
    name: string;
    /** Secondary text (e.g. artist names, handle, track count) */
    subtitle: string;
    /** Cover / profile image URL */
    imageUrl?: string | null;
    /** Entity type — defaults to "song" if omitted */
    type?: ItemType;
}

/** @deprecated Use `ListItem` instead. */
export type TrackListItem = ListItem;

interface TrackListProps {
    items: ListItem[];
    /** Called when the user taps a row */
    onItemPress?: (item: ListItem) => void;
    /** Infinite-scroll handler */
    onEndReached?: () => void;
    /** Show a loading spinner at the bottom */
    isLoadingMore?: boolean;
    /** Show an empty-state message when the list is empty */
    emptyMessage?: string;
    /** Show a type badge on the right side of each row */
    showTypeBadge?: boolean;
    /** Extra FlatList props (contentContainerStyle, ListHeaderComponent, etc.) */
    flatListProps?: Partial<FlatListProps<ListItem>>;

    // ── Deprecated aliases (so existing consumers keep working) ──
    /** @deprecated Use `items` */
    tracks?: ListItem[];
    /** @deprecated Use `onItemPress` */
    onTrackPress?: (item: ListItem) => void;
}

/** Returns true for types whose image should be circular. */
const isCircular = (type?: ItemType) => type === "user" || type === "artist";

/** Human-readable badge label for each type. */
const BADGE_LABELS: Record<ItemType, string> = {
    song: "Song",
    album: "Album",
    artist: "Artist",
    playlist: "Playlist",
    user: "User",
};

/** Fallback text when there is no image. */
const PLACEHOLDER_TEXT: Record<ItemType, string> = {
    song: "♪",
    album: "💿",
    artist: "🎤",
    playlist: "📃",
    user: "?",
};

export default function TrackList({
    items,
    onItemPress,
    onEndReached,
    isLoadingMore = false,
    emptyMessage = "Nothing here",
    showTypeBadge = false,
    flatListProps,
    // deprecated
    tracks,
    onTrackPress,
}: TrackListProps) {
    const data = items ?? tracks ?? [];
    const handlePress = onItemPress ?? onTrackPress;

    const { colors } = useTheme();

    const renderItem = useCallback(
        ({ item }: { item: ListItem }) => {
            const type = item.type ?? "song";
            const circular = isCircular(type);

            return (
                <Pressable
                    style={[styles.row, { borderBottomColor: colors.border }]}
                    onPress={() => handlePress?.(item)}
                    disabled={!handlePress}
                >
                    {/* Image / placeholder */}
                    {item.imageUrl ? (
                        <Image
                            source={{ uri: item.imageUrl }}
                            style={[
                                styles.image,
                                circular && styles.imageCircle,
                            ]}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : (
                        <View
                            style={[
                                styles.imagePlaceholder,
                                circular && styles.imageCircle,
                                { backgroundColor: colors.muted },
                            ]}
                        >
                            <ThemedText style={styles.placeholderText}>
                                {circular
                                    ? (item.name?.[0]?.toUpperCase() ?? PLACEHOLDER_TEXT[type])
                                    : PLACEHOLDER_TEXT[type]}
                            </ThemedText>
                        </View>
                    )}

                    {/* Text */}
                    <View style={styles.info}>
                        <ThemedText style={styles.title} numberOfLines={1}>
                            {item.name}
                        </ThemedText>
                        <ThemedText style={styles.subtitle} numberOfLines={1}>
                            {item.subtitle}
                        </ThemedText>
                    </View>

                    {/* Optional type badge */}
                    {showTypeBadge && (
                        <View
                            style={[
                                styles.badge,
                                { backgroundColor: colors.muted },
                            ]}
                        >
                            <ThemedText
                                style={[
                                    styles.badgeText,
                                    { color: colors.mutedForeground },
                                ]}
                            >
                                {BADGE_LABELS[type]}
                            </ThemedText>
                        </View>
                    )}
                </Pressable>
            );
        },
        [colors.border, colors.muted, colors.mutedForeground, handlePress, showTypeBadge],
    );

    return (
        <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
                isLoadingMore ? (
                    <ActivityIndicator
                        size="small"
                        color={colors.tint}
                        style={{ margin: 20 }}
                    />
                ) : null
            }
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <ThemedText>{emptyMessage}</ThemedText>
                </View>
            }
            {...flatListProps}
        />
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    image: {
        width: 50,
        height: 50,
        borderRadius: 4,
        backgroundColor: "#E1E1E1",
    },
    imageCircle: {
        borderRadius: 25,
    },
    imagePlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 4,
        justifyContent: "center",
        alignItems: "center",
    },
    placeholderText: {
        fontSize: 22,
    },
    info: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "center",
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        opacity: 0.7,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "600",
    },
    emptyContainer: {
        padding: 32,
        alignItems: "center",
    },
});
