// app/(app)/trips/[tripId]/check.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useItemStore } from "@/store/itemStore";
import { useTagStore } from "@/store/tagStore";
import { useTripStore } from "@/store/tripStore";
import { scanForTags, BleScanHandle } from "@/services/bleService";
import { calculateTripReadiness } from "@/services/readinessService";
import { evaluateSmartWarnings } from "@/services/smartWarningsService";
import { DetectedBleTag, TripReadinessResult } from "@/types";
import { StatusBanner } from "@/components/StatusBanner";
import { ItemRow } from "@/components/ItemRow";

type ScanState = "idle" | "scanning" | "done";

export default function CheckEverythingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const trip = useTripStore((s) => s.getTrip(tripId));
  const items = useItemStore((s) => s.getItemsForTrip(tripId));
  const tags = useTagStore((s) => s.tags);

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [detectedTags, setDetectedTags] = useState<DetectedBleTag[]>([]);
  const [result, setResult] = useState<TripReadinessResult | null>(null);
  const scanHandleRef = useRef<BleScanHandle | null>(null);

  const relevantBleIds = items
    .filter((i) => i.type === "tagged" && i.tagId)
    .map((i) => tags.find((t) => t.id === i.tagId)?.bleId)
    .filter((id): id is string => !!id);

  const runScan = useCallback(async () => {
    setScanState("scanning");
    setDetectedTags([]);
    setResult(null);

    const scan = scanForTags(
      { durationMs: 3000, knownBleIds: relevantBleIds },
      (tag) => setDetectedTags((prev) => [...prev, tag])
    );
    scanHandleRef.current = scan;

    const finalDetected = await scan;
    setScanState("done");

    const readiness = calculateTripReadiness(tripId, items, tags, finalDetected);
    // Additive advisory layer — never touches readiness's own status/results.
    if (trip) {
      readiness.advisoryWarnings = evaluateSmartWarnings(items, trip);
    }
    setResult(readiness);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, items, tags, trip]);

  useEffect(() => {
    runScan();
    return () => scanHandleRef.current?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {scanState === "scanning" && (
        <View style={styles.scanningBox}>
          <ActivityIndicator size="large" color="#4ADE80" />
          <Text style={styles.scanningText}>Scanning for nearby ReadyGo tags…</Text>
          <Text style={styles.scanningSub}>{detectedTags.length} tag(s) detected so far</Text>
        </View>
      )}

      {result && <StatusBanner result={result} />}

      {result && result.advisoryWarnings && result.advisoryWarnings.length > 0 && (
        <View style={styles.warningsBox}>
          <Text style={styles.warningsTitle}>Heads up</Text>
          {result.advisoryWarnings.map((w) => (
            <Text key={w.id} style={styles.warningText}>
              ⚠️ {w.message}
            </Text>
          ))}
        </View>
      )}

      {result && (
        <View>
          <Text style={styles.sectionTitle}>Checklist</Text>
          {result.results.map((r) => (
            <View key={r.item.id} style={styles.resultRow}>
              <ItemRow item={r.item} assignedTag={tags.find((t) => t.id === r.item.tagId)} />
              <Text style={r.isSatisfied ? styles.okText : styles.missingText}>
                {resultLabel(r.reason)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.button} onPress={runScan} disabled={scanState === "scanning"}>
        <Text style={styles.buttonText}>
          {scanState === "scanning" ? "Scanning…" : "Re-scan"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function resultLabel(reason?: string): string {
  switch (reason) {
    case "ok":
      return "✓ Detected / checked";
    case "manual_unchecked":
      return "Not checked off yet";
    case "tag_not_detected":
      return "Tag not detected nearby";
    case "tag_not_assigned":
      return "No tag assigned to this item";
    default:
      return "";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  scanningBox: { alignItems: "center", paddingVertical: 30 },
  scanningText: { color: "#F5F7FA", fontSize: 15, marginTop: 14 },
  scanningSub: { color: "#6C7A93", fontSize: 12, marginTop: 4 },
  warningsBox: {
    backgroundColor: "#3B3312",
    borderWidth: 1,
    borderColor: "#5D4E23",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  warningsTitle: { color: "#FACC15", fontSize: 13, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" },
  warningText: { color: "#F5F7FA", fontSize: 13, marginBottom: 4, lineHeight: 18 },
  sectionTitle: { color: "#9AA5B8", fontSize: 13, marginBottom: 4, marginTop: 8, textTransform: "uppercase" },
  resultRow: { marginBottom: 4 },
  okText: { color: "#4ADE80", fontSize: 12, marginLeft: 38, marginBottom: 6 },
  missingText: { color: "#F87171", fontSize: 12, marginLeft: 38, marginBottom: 6 },
  button: {
    backgroundColor: "#151C2C",
    borderWidth: 1,
    borderColor: "#232B3E",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20
  },
  buttonText: { color: "#F5F7FA", fontSize: 15, fontWeight: "600" }
});
