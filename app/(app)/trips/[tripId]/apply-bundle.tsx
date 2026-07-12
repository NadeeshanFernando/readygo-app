// app/(app)/trips/[tripId]/apply-bundle.tsx
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useBundleStore } from "@/store/bundleStore";
import { applyBundleToTrip } from "@/services/applyBundleToTrip";
import { Bundle } from "@/types";

export default function ApplyBundleScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const bundles = useBundleStore((s) => (currentUser ? s.getBundlesForUser(currentUser.id) : []));
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const packs = bundles.filter((b) => b.kind === "pack");
  const templates = bundles.filter((b) => b.kind === "template");

  const handleApply = async (bundle: Bundle) => {
    setApplyingId(bundle.id);
    try {
      const result = applyBundleToTrip(bundle.id, tripId);
      const parts: string[] = [];
      if (result.addedCount > 0) parts.push(`added ${result.addedCount} item${result.addedCount === 1 ? "" : "s"}`);
      if (result.skippedCount > 0) parts.push(`skipped ${result.skippedCount} already on this trip`);
      Alert.alert(
        `${bundle.name} applied`,
        parts.length > 0 ? parts.join(", ") + "." : "This bundle doesn't have any items yet.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } finally {
      setApplyingId(null);
    }
  };

  const renderSection = (title: string, data: Bundle[], emptyHint: string) => (
    <View style={{ marginBottom: 24 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.length === 0 ? (
        <Text style={styles.emptyHint}>{emptyHint}</Text>
      ) : (
        data.map((bundle) => (
          <Pressable
            key={bundle.id}
            style={styles.card}
            onPress={() => handleApply(bundle)}
            disabled={applyingId === bundle.id}
          >
            <Text style={styles.cardIcon}>{bundle.icon ?? (bundle.kind === "pack" ? "🎒" : "📋")}</Text>
            <Text style={styles.cardName}>{bundle.name}</Text>
            {applyingId === bundle.id && <Text style={styles.applying}>Applying…</Text>}
          </Pressable>
        ))
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {renderSection("Packs", packs, "No packs yet — create one from the Library tab.")}
      {renderSection("Templates", templates, "No templates yet — create one from the Library tab.")}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  sectionTitle: { color: "#9AA5B8", fontSize: 13, marginBottom: 10, textTransform: "uppercase" },
  emptyHint: { color: "#6C7A93", fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151C2C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232B3E",
    padding: 14,
    marginBottom: 8,
    gap: 10
  },
  cardIcon: { fontSize: 20 },
  cardName: { color: "#F5F7FA", fontSize: 15, fontWeight: "600", flex: 1 },
  applying: { color: "#4ADE80", fontSize: 12 }
});
