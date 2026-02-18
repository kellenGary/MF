import { Colors } from "@/constants/theme";
import React, { useMemo } from "react";
import { StyleSheet, View, Text, Dimensions } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Line } from "react-native-svg";
import { ThemedText } from "./themed-text";

export interface DataPoint {
    date: string;
    count: number;
}

interface MiniLineChartProps {
    data: DataPoint[];
    height?: number;
    width?: number; // Optional: auto calc
    color?: string;
}

export default function MiniLineChart({
    data,
    height = 160,
    width,
    color,
}: MiniLineChartProps) {
    const activeColor = color || Colors.primary;
    const screenWidth = Dimensions.get("window").width;
    const contentWidth = width || screenWidth - 64; // Default width inside a padded card

    const { path, gradientD, points, maxVal, minVal } = useMemo(() => {
        if (!data || data.length === 0) return { path: "", gradientD: "", points: [], maxVal: 0 };

        const maxVal = Math.max(...data.map(d => d.count)) || 10;
        const minVal = 0; // Always start at 0 for volume charts
        const range = maxVal - minVal || 1;

        // Padding inside SVG
        const paddingY = 20;
        const chartHeight = height - paddingY * 2;

        const stepX = contentWidth / (data.length - 1);

        // Calculate points
        const pts = data.map((d, i) => {
            const x = i * stepX;
            // Invert Y: 0 is top
            const normalized = (d.count - minVal) / range;
            const y = (height - paddingY) - (normalized * chartHeight);
            return { x, y, val: d.count, label: d.date };
        });

        // Generate Path (Start M)
        if (pts.length < 2) return { path: "", gradientD: "", points: pts, maxVal };

        let d = `M ${pts[0].x} ${pts[0].y}`;

        // Simple cubic bezier smoothing
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const curr = pts[i];

            // Control Points
            const cp1x = prev.x + (curr.x - prev.x) / 2;
            const cp1y = prev.y;
            const cp2x = prev.x + (curr.x - prev.x) / 2; // S-curve logic
            const cp2y = curr.y;

            d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.x} ${curr.y}`;
        }

        // Gradient Fill Path: Close the loop down to bottom
        const gradientD = `${d} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;

        return { path: d, gradientD, points: pts, maxVal, minVal };
    }, [data, height, contentWidth]);

    if (!data?.length) return null;

    return (
        <View style={[styles.container, { height, width: contentWidth }]}>
            <Svg width={contentWidth} height={height}>
                <Defs>
                    <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={activeColor} stopOpacity="0.5" />
                        <Stop offset="1" stopColor={activeColor} stopOpacity="0" />
                    </LinearGradient>
                </Defs>

                {/* Gradient Area */}
                <Path d={gradientD} fill="url(#gradient)" />

                {/* Main Line */}
                <Path
                    d={path}
                    stroke={activeColor}
                    strokeWidth={3}
                    strokeLinecap="round"
                    fill="none"
                />

                {/* Dots */}
                {points.map((p, i) => (
                    <View key={i} /> // dots optional for clean look
                ))}

            </Svg>

            {/* X-Axis Labels */}
            <View style={styles.labelsContainer}>
                <ThemedText style={styles.label}>{points[0]?.label}</ThemedText>
                <ThemedText style={styles.label}>{points[points.length - 1]?.label}</ThemedText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
        justifyContent: 'center',
    },
    labelsContainer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    label: {
        fontSize: 10,
        opacity: 0.6,
    }
});
