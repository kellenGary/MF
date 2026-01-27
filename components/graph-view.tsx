import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue
} from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";

interface User {
    id: number;
    displayName: string;
    handle: string;
    profileImageUrl?: string;
}

interface GraphViewProps {
    users: User[];
    currentUser: any;
    followStatus: Record<number, boolean>;
    onToggleFollow: (userId: number) => void;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const NODE_SIZE = 60;
const SPACING = 120; // Distance between nodes in spiral
const GRAPH_SIZE = 4000; // Large canvas for connections


export default function GraphView({
    users,
    currentUser,
    followStatus,
    onToggleFollow,
}: GraphViewProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // --- Animation State ---
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const onLayout = (event: any) => {
        const { width, height } = event.nativeEvent.layout;
        setContainerSize({ width, height });
    };

    // --- Calculate Node Positions (Spiral) ---
    const nodePositions = useMemo(() => {
        // Current user is always at (0,0)
        // Other users spiral out
        return users.map((user, index) => {
            // Golden angle in radians
            const angle = index * 2.39996;
            // Radius depends on index (sqrt distributes area evenly)
            const radius = SPACING * Math.sqrt(index + 1);

            return {
                user,
                x: radius * Math.cos(angle),
                y: radius * Math.sin(angle),
            };
        });
    }, [users]);

    // --- Gestures ---
    const panGesture = Gesture.Pan()
        .onChange((e) => {
            translateX.value = savedTranslateX.value + e.translationX;
            translateY.value = savedTranslateY.value + e.translationY;
        })
        .onEnd((e) => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const pinchGesture = Gesture.Pinch()
        .onChange((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    // Helper to render user avatar
    const renderUserNode = (user: User, x: number, y: number, isCenter: boolean = false) => {
        const isFollowing = followStatus[user.id];

        return (
            <View
                key={user.id || 'me'}
                style={[
                    styles.nodeContainer,
                    {
                        left: x - NODE_SIZE / 2,
                        top: y - NODE_SIZE / 2,
                        zIndex: isCenter ? 100 : 10,
                    },
                ]}
            >
                <Pressable
                    onPress={() => !isCenter && onToggleFollow(user.id)}
                    style={[
                        styles.avatarContainer,
                        {
                            borderColor: isCenter
                                ? colors.tint
                                : isFollowing
                                    ? colors.primary
                                    : colors.icon
                        }
                    ]}
                >
                    {user.profileImageUrl ? (
                        <Image
                            source={{ uri: user.profileImageUrl }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                            <ThemedText style={styles.avatarText}>
                                {user.displayName?.[0]?.toUpperCase() || "?"}
                            </ThemedText>
                        </View>
                    )}
                </Pressable>
                <ThemedText style={styles.nodeLabel} numberOfLines={1}>
                    {isCenter ? "Me" : user.displayName}
                </ThemedText>
                {!isCenter && (
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: isFollowing ? colors.primary : colors.muted }
                    ]}>
                        <Text style={[styles.statusText, { color: isFollowing ? colors.primaryForeground : colors.mutedForeground }]}>
                            {isFollowing ? "Following" : "Follow"}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    if (containerSize.width === 0) {
        return <View style={styles.container} onLayout={onLayout} />;
    }

    return (
        <GestureHandlerRootView style={styles.container} onLayout={onLayout}>
            <GestureDetector gesture={composedGesture}>
                <View style={styles.gestureArea}>
                    <Animated.View
                        style={[
                            styles.graphContent,
                            {
                                left: containerSize.width / 2,
                                top: containerSize.height / 2,
                            },
                            animatedStyle,
                        ]}
                    >
                        {/* Connections Layer (SVG) - Placed BEFORE nodes so it renders behind them naturally */}
                        <View
                            style={{
                                position: 'absolute',
                                width: GRAPH_SIZE,
                                height: GRAPH_SIZE,
                                left: -GRAPH_SIZE / 2,
                                top: -GRAPH_SIZE / 2,
                            }}
                            pointerEvents="none"
                        >
                            <Svg
                                height={GRAPH_SIZE}
                                width={GRAPH_SIZE}
                                viewBox={`${-GRAPH_SIZE / 2} ${-GRAPH_SIZE / 2} ${GRAPH_SIZE} ${GRAPH_SIZE}`}
                                style={{ overflow: 'visible' }}
                            >
                                {nodePositions.map((node) => {
                                    const isFollowing = followStatus[node.user.id];
                                    return (
                                        <Line
                                            key={`line-${node.user.id}`}
                                            x1={0}
                                            y1={0}
                                            x2={node.x}
                                            y2={node.y}
                                            stroke={isFollowing ? colors.primary : colors.text}
                                            strokeWidth={2}
                                            strokeDasharray={isFollowing ? "0, 0" : "5, 5"}
                                            opacity={0.5}
                                        />
                                    );
                                })}
                            </Svg>
                        </View>

                        {/* Nodes Layer */}
                        {currentUser && renderUserNode(currentUser, 0, 0, true)}
                        {nodePositions.map((node) => renderUserNode(node.user, node.x, node.y))}
                    </Animated.View>
                </View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    gestureArea: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    graphContent: {
        position: "absolute",
        // We want the view to have 0 size but visible overflow so it acts as an anchor point
        width: 0,
        height: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    nodeContainer: {
        position: "absolute",
        width: NODE_SIZE,
        height: NODE_SIZE + 40, // Extra space for text
        alignItems: "center",
        justifyContent: "flex-start",
    },
    avatarContainer: {
        width: NODE_SIZE,
        height: NODE_SIZE,
        borderRadius: NODE_SIZE / 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarImage: {
        width: "100%",
        height: "100%",
        borderRadius: NODE_SIZE / 2,
    },
    avatarPlaceholder: {
        width: "100%",
        height: "100%",
        borderRadius: NODE_SIZE / 2,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        fontSize: 24,
        fontWeight: "bold",
    },
    nodeLabel: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: "600",
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 2,
    },
    statusBadge: {
        marginTop: 2,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 8,
        fontWeight: 'bold',
    }
});
