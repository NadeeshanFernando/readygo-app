// src/components/StatusBanner.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TripReadinessResult } from "@/types";

interface Props {
  result: TripReadinessResult;
}

export function StatusBanner({ result }: Props) {
  const isReady = result.status === "ready";
  return (
    <View style={[styles.banner, isReady ? styles.ready : styles.notReady]}>
      <Text style={styles.icon}>{isReady ? "✅" : "⚠️"}</Text>
      <Text style={styles.title}>{isReady ? "Ready to go!" : "Not Ready"}</Text>
      <Text style={styles.subtitle}>
        {isReady
          ? "All checklist items are accounted for."
          : `${result.missingItems.length} item${result.missingItems.length === 1 ? "" : "s"} still missing`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16
  },
  ready: { backgroundColor: "#123B2A", borderWidth: 1, borderColor: "#1F5D3E" },
  notReady: { backgroundColor: "#3B1414", borderWidth: 1, borderColor: "#5D2323" },
  icon: { fontSize: 32, marginBottom: 6 },
  title: { color: "#F5F7FA", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#B7C0CF", fontSize: 13, marginTop: 4 }
});
