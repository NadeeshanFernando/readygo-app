// src/components/TagBadge.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}

const toneColors: Record<NonNullable<Props["tone"]>, { bg: string; fg: string }> = {
  neutral: { bg: "#232B3E", fg: "#C4CCDA" },
  success: { bg: "#123B2A", fg: "#4ADE80" },
  warning: { bg: "#3B3312", fg: "#FACC15" },
  danger: { bg: "#3B1414", fg: "#F87171" }
};

export function TagBadge({ label, tone = "neutral" }: Props) {
  const colors = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start"
  },
  text: { fontSize: 12, fontWeight: "600" }
});
