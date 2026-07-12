// app/(app)/library/index.tsx
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useMasterItemStore } from "@/store/masterItemStore";
import { useBundleStore } from "@/store/bundleStore";
import { seedStarterTemplatesIfNeeded } from "@/services/seedStarterTemplates";
import { TagBadge } from "@/components/TagBadge";
import { MasterItem, Bundle } from "@/types";

type Segment = "items" | "packs" | "templates";

export default function LibraryScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [segment, setSegment] = useState<Segment>("items");

  useEffect(() => {
    if (currentUser) seedStarterTemplatesIfNeeded(currentUser.id);
  }, [currentUser]);

  const masterItems = useMasterItemStore((s) => (currentUser ? s.getMasterItemsForUser(currentUser.id) : []));
  const toggleAlwaysCarry = useMasterItemStore((s) => s.toggleAlwaysCarry);
  const deleteMasterItem = useMasterItemStore((s) => s.deleteMasterItem);

  const bundles = useBundleStore((s) =>
    currentUser ? s.getBundlesForUser(currentUser.id, segment === "packs" ? "pack" : segment === "templates" ? "template" : undefined) : []
  );
  const deleteBundle = useBundleStore((s) => s.deleteBundle);

  const confirmDeleteItem = (item: MasterItem) => {
    Alert.alert("Remove from library?", `"${item.name}" will no longer appear in autocomplete or bundles.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteMasterItem(item.id) }
    ]);
  };

  const confirmDeleteBundle = (bundle: Bundle) => {
    Alert.alert(`Delete "${bundle.name}"?`, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteBundle(bundle.id) }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        {(["items", "packs", "templates"] as Segment[]).map((s) => (
          <Pressable
            key={s}
            style={[styles.segment, segment === s && styles.segmentActive]}
            onPress={() => setSegment(s)}
          >
            <Text style={[styles.segmentText, segment === s && styles.segmentTextActive]}>
              {s === "items" ? "Items" : s === "packs" ? "Packs" : "Templates"}
            </Text>
          </Pressable>
        ))}
      </View>

      {segment === "items" ? (
        <FlatList
          data={masterItems}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No items yet. Items are added here automatically the first time you type a new one on any trip —
                or add one directly below.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(app)/library/items/${item.id}`)}
              onLongPress={() => confirmDeleteItem(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {item.defaultType === "tagged" ? "Tagged essential" : "Manual"} · used {item.timesUsed}x
                </Text>
              </View>
              {item.alwaysCarry && <TagBadge label="Always carry ⭐" tone="success" />}
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={bundles}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {segment === "packs"
                  ? "No packs yet. Create one for a bag you use often, like a Camera Bag or Gym Bag."
                  : "No templates yet. Create one for a type of trip you take often, like Business or Beach."}
              </Text>
            </View>
          }
          renderItem={({ item: bundle }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(app)/library/bundles/${bundle.id}`)}
              onLongPress={() => confirmDeleteBundle(bundle)}
            >
              <Text style={styles.cardIcon}>{bundle.icon ?? (bundle.kind === "pack" ? "🎒" : "📋")}</Text>
              <Text style={styles.cardName}>{bundle.name}</Text>
            </Pressable>
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() =>
          segment === "items"
            ? router.push("/(app)/library/items/new")
            : router.push(`/(app)/library/bundles/new?kind=${segment === "packs" ? "pack" : "template"}`)
        }
      >
        <Text style={styles.fabText}>
          {segment === "items" ? "+ New Item" : segment === "packs" ? "+ New Pack" : "+ New Template"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  segmentRow: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 8 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#232B3E",
    alignItems: "center"
  },
  segmentActive: { backgroundColor: "#123B2A", borderColor: "#1F5D3E" },
  segmentText: { color: "#9AA5B8", fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: "#4ADE80" },
  empty: { marginTop: 60, alignItems: "center", paddingHorizontal: 40 },
  emptyText: { color: "#6C7A93", textAlign: "center", fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151C2C",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#232B3E",
    gap: 10
  },
  cardIcon: { fontSize: 20 },
  cardName: { color: "#F5F7FA", fontSize: 15, fontWeight: "600" },
  cardMeta: { color: "#6C7A93", fontSize: 12, marginTop: 2 },
  fab: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#4ADE80",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center"
  },
  fabText: { color: "#0B1220", fontWeight: "700", fontSize: 15 }
});
