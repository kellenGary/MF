import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
    interpolateColor,
    interpolate
} from "react-native-reanimated";

import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface FilterPillProps {
    label: string;
    isActive: boolean;
    onPress: () => void;
}

export const FilterPill = ({ label, isActive, onPress }: FilterPillProps) => {
    const isDark = useColorScheme() === "dark";
    const themeColors = isDark ? Colors.dark : Colors.light;

    // Use a shared value to drive the animation
    const activeProgress = useSharedValue(isActive ? 1 : 0);

    useEffect(() => {
        activeProgress.value = withTiming(isActive ? 1 : 0, { duration: 250 });
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            backgroundColor: interpolateColor(
                activeProgress.value,
                [0, 1],
                ["rgba(83, 140, 233, 0)", Colors.primary]
            ),
            transform: [
                { scale: interpolate(activeProgress.value, [0, 1], [1, 1.05]) }
            ],
            // Animate border opacity or remove it when active
            borderColor: interpolateColor(
                activeProgress.value,
                [0, 1],
                [themeColors.border, Colors.primary]
            )
        };
    });

    const animatedTextStyle = useAnimatedStyle(() => {
        return {
            color: interpolateColor(
                activeProgress.value,
                [0, 1],
                [themeColors.text, "#FFFFFF"]
            )
        };
    });

    return (
        <Pressable onPress={onPress}>
            <Animated.View style={[
                styles.filterPill,
                animatedStyle,
                { borderWidth: 1 }
            ]}>
                <Animated.Text style={[
                    styles.label,
                    animatedTextStyle,
                    { fontWeight: isActive ? "bold" : "normal" }
                ]}>
                    {label}
                </Animated.Text>
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    filterPill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
    }
});
