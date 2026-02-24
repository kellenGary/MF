import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/contexts/ThemeContext";
import { CompatibilityResult } from "@/services/profileApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CompatibilityScoreProps {
    compatibility: CompatibilityResult | null;
    loading: boolean;
}

export default function CompatibilityScore({
    compatibility,
    loading,
}: CompatibilityScoreProps) {
    const { colors } = useTheme();
    const animatedProgress = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const RING_SIZE = 100;
    const STROKE_WIDTH = 8;
    const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

    useEffect(() => {
        if (compatibility && !compatibility.insufficientData) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedProgress, {
                    toValue: compatibility.score / 100,
                    duration: 1200,
                    easing: Easing.out(Easing.exp),
                    useNativeDriver: false,
                }),
            ]).start();
        } else if (compatibility?.insufficientData) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }
    }, [compatibility]);

    if (loading) {
        return null;
    }

    if (!compatibility) {
        return null;
    }

    // Insufficient data state
    if (compatibility.insufficientData) {
        return (
            <Animated.View
                style={[
                    styles.container,
                    { backgroundColor: colors.card, opacity: fadeAnim },
                ]}
            >
                <View style={styles.insufficientContainer}>
                    <MaterialIcons name="music-note" size={28} color={colors.textSecondary} />
                    <ThemedText type="defaultSemiBold" style={styles.insufficientTitle}>
                        Music Compatibility
                    </ThemedText>
                    <ThemedText
                        type="small"
                        style={[styles.insufficientText, { color: colors.textSecondary }]}
                    >
                        Not enough listening data yet to compute a score
                    </ThemedText>
                </View>
            </Animated.View>
        );
    }

    const strokeDashoffset = animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [CIRCUMFERENCE, 0],
    });

    const getScoreColor = (score: number) => {
        if (score >= 70) return "#4CAF50";
        if (score >= 40) return "#FF9800";
        return "#F44336";
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return "Soul Mates 🎶";
        if (score >= 60) return "Great Match";
        if (score >= 40) return "Some Overlap";
        if (score >= 20) return "Different Vibes";
        return "Opposites";
    };

    const scoreColor = getScoreColor(compatibility.score);

    return (
        <Animated.View
            style={[
                styles.container,
                { backgroundColor: colors.card, opacity: fadeAnim },
            ]}
        >
            {/* Header */}
            <ThemedText type="small" style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Music Compatibility
            </ThemedText>

            {/* Score Ring + Label */}
            <View style={styles.scoreRow}>
                <View style={styles.ringContainer}>
                    <Svg width={RING_SIZE} height={RING_SIZE}>
                        {/* Background ring */}
                        <Circle
                            cx={RING_SIZE / 2}
                            cy={RING_SIZE / 2}
                            r={RADIUS}
                            stroke={colors.border || "rgba(255,255,255,0.1)"}
                            strokeWidth={STROKE_WIDTH}
                            fill="none"
                        />
                        {/* Progress ring */}
                        <AnimatedCircle
                            cx={RING_SIZE / 2}
                            cy={RING_SIZE / 2}
                            r={RADIUS}
                            stroke={scoreColor}
                            strokeWidth={STROKE_WIDTH}
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={strokeDashoffset}
                            rotation="-90"
                            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                        />
                    </Svg>
                    <View style={styles.scoreTextOverlay}>
                        <ThemedText type="subtitle" style={[styles.scoreNumber, { color: scoreColor }]}>
                            {Math.round(compatibility.score)}%
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.labelContainer}>
                    <ThemedText type="defaultSemiBold" style={styles.scoreLabel}>
                        {getScoreLabel(compatibility.score)}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                        Based on your listening overlap
                    </ThemedText>
                </View>
            </View>

            {/* Breakdown */}
            {compatibility.breakdown && compatibility.breakdown.length > 0 && (
                <View style={styles.breakdownContainer}>
                    {compatibility.breakdown
                        .filter((f) => f.hasData)
                        .map((factor, index) => (
                            <View key={index} style={styles.breakdownItem}>
                                <View style={styles.breakdownLeft}>
                                    <MaterialIcons
                                        name={getFactorIcon(factor.name)}
                                        size={16}
                                        color={colors.textSecondary}
                                    />
                                    <ThemedText type="small" style={{ marginLeft: 8 }}>
                                        {factor.label}
                                    </ThemedText>
                                </View>
                                <View
                                    style={[
                                        styles.factorBadge,
                                        { backgroundColor: scoreColor + "20" },
                                    ]}
                                >
                                    <ThemedText
                                        type="small"
                                        style={[styles.factorScore, { color: scoreColor }]}
                                    >
                                        {Math.round(factor.score)}%
                                    </ThemedText>
                                </View>
                            </View>
                        ))}
                </View>
            )}
        </Animated.View>
    );
}

function getFactorIcon(name: string): React.ComponentProps<typeof MaterialIcons>["name"] {
    switch (name) {
        case "Shared Tracks":
            return "audiotrack";
        case "Liked Albums":
            return "album";
        case "Followed Artists":
            return "person";
        case "Genre Overlap":
            return "category";
        default:
            return "music-note";
    }
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
    },
    sectionLabel: {
        textAlign: "center",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 1,
        fontSize: 11,
    },
    scoreRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        marginBottom: 16,
    },
    ringContainer: {
        width: 100,
        height: 100,
        justifyContent: "center",
        alignItems: "center",
    },
    scoreTextOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    scoreNumber: {
        fontSize: 22,
        fontWeight: "700",
    },
    labelContainer: {
        flex: 1,
        gap: 4,
    },
    scoreLabel: {
        fontSize: 18,
    },
    breakdownContainer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(255,255,255,0.1)",
        paddingTop: 12,
        gap: 10,
    },
    breakdownItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    breakdownLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    factorBadge: {
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    factorScore: {
        fontWeight: "600",
        fontSize: 12,
    },
    insufficientContainer: {
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
    },
    insufficientTitle: {
        fontSize: 16,
    },
    insufficientText: {
        textAlign: "center",
    },
});
