// app/(app)/library/bundles/[bundleId]/add-item.tsx
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useMasterItemStore } from "@/store/masterItemStore";
import { useBundleStore } from "@/store/bundleStore";

export default function AddBundleItemScreen() {
  const { bundleId } = useLocalSearchParams<{ bundleId: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();

  const masterItems = useMasterItemStore((s) => (currentUser ? s.getMasterItemsForUser(currentUser.id) : []));
  const addMasterItem = useMasterItemStore((s) => s.addMasterItem);
  const addBundleItem = useBundleStore((s) => s.addBundleItem);
  const existingBundleItems = useBundleStore((s) => s.getBundleItems(bundleId));

  const [query, setQuery] = useState("");

  const alreadyInBundle = new Set(existingBundleItems.map((bi) => bi.masterItemId));
  const filtered = masterItems.filter(
    (m) => !alreadyInBundle.has(m.id) && m.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const handlePickExisting = (masterItemId: string) => {
    addBundleItem(bundleId, masterItemId, 1);
    router.back();
  };

  const handleCreateAndAdd = () => {
    if (!currentUser || !query.trim()) return;
    const newItem = addMasterItem({ userId: currentUser.id, name: query.trim(), defaultType: "manual" });
    addBundleItem(bundleId, newItem.id, 1);
    router.back();
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search or type a new item name"
        placeholderTextColor="#6C7A93"
        value={query}
        onChangeText={setQuery}
        autoFocus
      />

      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingTop: 12 }}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => handlePickExisting(item.id)}>
            <Text style={styles.rowText}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.defaultType === "tagged" ? "Tagged" : "Manual"}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          query.trim() ? (
            <Pressable style={styles.createRow} onPress={handleCreateAndAdd}>
              <Text style={styles.createRowText}>+ Create "{query.trim()}" and add it</Text>
            </Pressable>
          ) : (
            <Text style={styles.hint}>Start typing to search your library or create a new item.</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220", padding: 20 },
  input: {
    backgroundColor: "#151C2C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232B3E",
    color: "#F5F7FA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1D2536"
  },
  rowText: { color: "#F5F7FA", fontSize: 15 },
  rowMeta: { color: "#6C7A93", fontSize: 12 },
  createRow: {
    marginTop: 16,
    backgroundColor: "#123B2A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F5D3E",
    padding: 14,
    alignItems: "center"
  },
  createRowText: { color: "#4ADE80", fontWeight: "600" },
  hint: { color: "#6C7A93", fontSize: 13, marginTop: 16, textAlign: "center" }
});
