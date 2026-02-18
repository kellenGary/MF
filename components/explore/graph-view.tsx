import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  SimulationLinkDatum,
  SimulationNodeDatum,
} from "d3-force";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
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
  connections: { followerId: number; followeeId: number }[];
}

interface SimNode extends SimulationNodeDatum {
  id: number;
  user: User;
  isCenter: boolean;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  isDirect: boolean;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const NODE_SIZE = 60;
const NODE_RADIUS = NODE_SIZE / 2 + 20;
const GRAPH_SIZE = 4000;

// --- Memoized User Node Component ---
const UserNode = React.memo(
  ({
    user,
    x,
    y,
    isCenter,
    isFollowing,
    colors,
    onToggleFollow,
  }: {
    user: User;
    x: number;
    y: number;
    isCenter: boolean;
    isFollowing?: boolean;
    colors: any;
    onToggleFollow: (id: number) => void;
  }) => {
    const router = useRouter();

    return (
      <View
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
          onPress={() => {
            if (isCenter) {
              router.push("/profile");
            } else {
              router.push(`/profile/${user.id}`);
            }
          }}
          onLongPress={() => !isCenter && onToggleFollow(user.id)}
          delayLongPress={300}
          style={[
            styles.avatarContainer,
            {
              borderColor: isCenter
                ? colors.tint
                : isFollowing
                  ? Colors.primary
                  : colors.icon,
            },
          ]}
        >
          {user.profileImageUrl ? (
            <Image
              source={{ uri: user.profileImageUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: colors.muted },
              ]}
            >
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
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isFollowing ? Colors.primary : colors.muted },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isFollowing
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                },
              ]}
            >
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </View>
        )}
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.user.id === next.user.id &&
      prev.x === next.x &&
      prev.y === next.y &&
      prev.isCenter === next.isCenter &&
      prev.isFollowing === next.isFollowing &&
      prev.colors === next.colors
    );
  }
);

export default function GraphView({
  users,
  currentUser,
  followStatus,
  onToggleFollow,
  connections = [],
}: GraphViewProps) {
  const { colors } = useTheme();

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [nodePositions, setNodePositions] = useState<Map<number, { x: number; y: number }>>(new Map());

  // --- Animation State ---
  const scale = useSharedValue(0.05); // Start zoomed out further
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const hasAnimated = React.useRef(false);

  useEffect(() => {
    if (nodePositions.size > 0 && !hasAnimated.current) {
      hasAnimated.current = true;
      scale.value = withDelay(100, withTiming(1, { duration: 800, easing: Easing.out(Easing.exp) }));
    }
  }, [nodePositions.size]);

  const onLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  // --- Build nodes and links for simulation ---
  const { nodes, links } = useMemo(() => {
    const nodeList: SimNode[] = [];
    const linkList: SimLink[] = [];
    const nodeIdSet = new Set<number>();

    // Helper sets for classification
    const directFollowIDs = new Set<number>();
    Object.entries(followStatus).forEach(([id, isFollowing]) => {
      if (isFollowing) directFollowIDs.add(Number(id));
    });

    // Add current user as center node (fixed position)
    if (currentUser) {
      nodeList.push({
        id: currentUser.id,
        user: currentUser,
        isCenter: true,
        fx: 0,
        fy: 0,
        x: 0,
        y: 0,
      });
      nodeIdSet.add(currentUser.id);
    }

    // 1. Identify and Add Direct Connections (Degree 1)
    // We want to place these in a primary ring
    const degree1Nodes: User[] = [];
    const degree2Nodes: { user: User; connectedTo: number }[] = [];
    const otherNodes: User[] = [];

    users.forEach((user) => {
      if (currentUser && user.id === currentUser.id) return;

      if (directFollowIDs.has(user.id)) {
        degree1Nodes.push(user);
      } else {
        // checks connections to see if connected to a degree 1 node
        // This is a simple heuristic: if I don't follow them, but they are connected to someone I follow
        const connectedToDirect = connections.find(c =>
          (c.followerId === user.id && directFollowIDs.has(c.followeeId)) ||
          (c.followeeId === user.id && directFollowIDs.has(c.followerId))
        );

        if (connectedToDirect) {
          const parentId = connectedToDirect.followerId === user.id
            ? connectedToDirect.followeeId
            : connectedToDirect.followerId;
          degree2Nodes.push({ user, connectedTo: parentId });
        } else {
          otherNodes.push(user);
        }
      }
    });

    // Helper to add node checking for duplicates
    const addNode = (user: User, x: number, y: number) => {
      if (nodeIdSet.has(user.id)) return;
      nodeList.push({
        id: user.id,
        user,
        isCenter: false,
        x, // Initial hints for simulation
        y,
      });
      nodeIdSet.add(user.id);
    };

    // 2. Position Degree 1 Nodes (Primary Ring)
    const primaryRadius = 250;
    degree1Nodes.forEach((user, index) => {
      const angle = (index / (degree1Nodes.length || 1)) * Math.PI * 2;
      addNode(user, Math.cos(angle) * primaryRadius, Math.sin(angle) * primaryRadius);
    });

    // 3. Position Degree 2 Nodes (Clusters around their parent)
    const clusterRadius = 80;
    degree2Nodes.forEach(({ user, connectedTo }) => {
      // Find parent's position (heuristic or actual if already added)
      // Since we just added them to nodeList, we can try to find them
      const parentNode = nodeList.find(n => n.id === connectedTo);
      let baseX = 0, baseY = 0;

      if (parentNode) {
        baseX = parentNode.x || 0;
        baseY = parentNode.y || 0;
      } else {
        // Fallback if parent not found (shouldn't happen with correct order)
        // Place vaguely in the ring
        const angle = Math.random() * Math.PI * 2;
        baseX = Math.cos(angle) * primaryRadius;
        baseY = Math.sin(angle) * primaryRadius;
      }

      // Random offset from parent
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * clusterRadius;
      addNode(user, baseX + Math.cos(angle) * r, baseY + Math.sin(angle) * r);
    });

    // 4. Position Others (Randomly further out)
    otherNodes.forEach((user) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 400 + Math.random() * 100;
      addNode(user, Math.cos(angle) * radius, Math.sin(angle) * radius);
    });


    // Add links
    if (currentUser) {
      Object.entries(followStatus).forEach(([userId, isFollowing]) => {
        if (isFollowing && nodeIdSet.has(Number(userId))) {
          linkList.push({
            source: currentUser.id,
            target: Number(userId),
            isDirect: true, // Degree 1 connection
          });
        }
      });
    }

    connections.forEach((conn) => {
      if (!nodeIdSet.has(conn.followerId) || !nodeIdSet.has(conn.followeeId)) return;
      if (currentUser && conn.followerId === currentUser.id) return;

      linkList.push({
        source: conn.followerId,
        target: conn.followeeId,
        isDirect: false, // Degree 2 connection
      });
    });

    return { nodes: nodeList, links: linkList };
  }, [users, connections, currentUser, followStatus]);

  // --- Run force simulation synchronously only when structure changes ---
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulation = forceSimulation(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((d) => {
            // Dynamic link distance
            if (d.isDirect) return 200; // Long leash for center -> Degree 1
            return 60; // Short leash for Degree 1 -> Degree 2 (tight clusters)
          })
          .strength((d) => {
            if (d.isDirect) return 0.1; // Softer pull from center
            return 0.8; // Strong pull to keep clusters together
          })
      )
      .force(
        "charge",
        forceManyBody()
          .strength((d: any) => {
            if (d.isCenter) return -300; // Strong repulsion from center
            return -100; // Standard repulsion between nodes
          })
          .distanceMax(300)
      )
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius(NODE_RADIUS * 1.2) // Slightly larger collision radius
          .strength(0.8)
          .iterations(3)
      )
      .force("center", forceCenter(0, 0).strength(0.02)); // Very weak centering to allow drift

    // Pre-calculate ~300 ticks to stabilize the graph
    simulation.tick(300);
    simulation.stop();

    const newPositions = new Map<number, { x: number; y: number }>();
    nodes.forEach((node) => {
      newPositions.set(node.id, { x: node.x || 0, y: node.y || 0 });
    });
    setNodePositions(new Map(newPositions));

  }, [nodes, links]); // Re-run if graph topology changes

  // --- Gestures ---
  const panGesture = Gesture.Pan()
    .onChange((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
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

  if (containerSize.width === 0) {
    return <View style={styles.container} onLayout={onLayout} />;
  }

  const centerOffsetX = containerSize.width / 2;
  const centerOffsetY = containerSize.height / 2;

  // Show loading while positions are being calculated
  const isCalculating = users.length > 0 && nodePositions.size === 0;

  return (
    <View style={styles.container} onLayout={onLayout}>
      {isCalculating && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={styles.loadingText}>Organizing visualizer...</ThemedText>
        </View>
      )}

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.gestureArea, animatedStyle, { opacity: isCalculating ? 0 : 1 }]}>
          {/* Connections Layer (SVG) */}
          <View
            style={[
              styles.svgContainer,
              {
                left: centerOffsetX - GRAPH_SIZE / 2,
                top: centerOffsetY - GRAPH_SIZE / 2,
              },
            ]}
            pointerEvents="none"
          >
            <Svg
              height={GRAPH_SIZE}
              width={GRAPH_SIZE}
              viewBox={`${-GRAPH_SIZE / 2} ${-GRAPH_SIZE / 2} ${GRAPH_SIZE} ${GRAPH_SIZE}`}
            >
              {links.map((link, idx) => {
                const sourceId = typeof link.source === "object" ? link.source.id : link.source;
                const targetId = typeof link.target === "object" ? link.target.id : link.target;

                // Use positions from map instead of node object to ensure sync with render
                const sourcePos = nodePositions.get(Number(sourceId));
                const targetPos = nodePositions.get(Number(targetId));

                if (!sourcePos || !targetPos) return null;

                const isFollowedConnection = !link.isDirect && (
                  followStatus[Number(sourceId)] || followStatus[Number(targetId)]
                );
                const isSolid = link.isDirect || isFollowedConnection;

                return (
                  <Line
                    key={`link-${idx}`}
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke={link.isDirect ? Colors.primary : "#FFFFFF"}
                    strokeWidth={isSolid ? 0.5 : 1}
                    opacity={link.isDirect ? 0.8 : (isFollowedConnection ? 0.6 : 0.4)}
                  />
                );
              })}
            </Svg>
          </View>

          {/* Nodes Layer */}
          {nodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            return (
              <UserNode
                key={node.id}
                user={node.user}
                x={centerOffsetX + pos.x}
                y={centerOffsetY + pos.y}
                isCenter={node.isCenter}
                isFollowing={followStatus[node.id]}
                colors={colors}
                onToggleFollow={onToggleFollow}
              />
            );
          })}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  gestureArea: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  svgContainer: {
    position: "absolute",
    width: GRAPH_SIZE,
    height: GRAPH_SIZE,
  },
  nodeContainer: {
    position: "absolute",
    width: NODE_SIZE,
    height: NODE_SIZE + 40,
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
    borderWidth: 2, // Added border width to make borderColor visible
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
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
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
    fontWeight: "bold",
  },
});
