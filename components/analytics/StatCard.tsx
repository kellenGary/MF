import React from "react";
import { View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeInRight } from "react-native-reanimated";

import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface StatCardProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    value: string | number;
    label: string;
    color: string;
    delay?: number;
}

export const StatCard = ({
    icon,
    value,
    label,
    color,
    delay = 0,
}: StatCardProps) => {
    const { colors } = useColorScheme() === "dark"
        ? { colors: Colors.dark }
        : { colors: Colors.light };

    return (
        <Animated.View
            entering={FadeInRight.delay(delay).springify()}
            style={[styles.statCardContainer, { backgroundColor: colors.card }]}
        >
            <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
                <MaterialIcons name={icon} size={24} color={color} />
            </View>
            <View>
                <ThemedText type="subtitle" style={{ fontSize: 20 }}>{value}</ThemedText>
                <ThemedText type="small" style={{ color: colors.icon }}>{label}</ThemedText>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    statCardContainer: {
        width: 140,
        padding: 16,
        borderRadius: 20,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
});
