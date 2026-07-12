// app/(app)/library/bundles/[bundleId]/index.tsx
import React, { useLayoutEffect } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useBundleStore } from "@/store/bundleStore";
import { useMasterItemStore } from "@/store/masterItemStore";

export default function BundleDetailScreen() {
  const { bundleId } = useLocalSearchParams<{ bundleId: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const bundle = useBundleStore((s) => s.getBundle(bundleId));
  const bundleItems = useBundleStore((s) => s.getBundleItems(bundleId));
  const removeBundleItem = useBundleStore((s) => s.removeBundleItem);
  const deleteBundle = useBundleStore((s) => s.deleteBundle);

  const masterItems = useMasterItemStore((s) => s.masterItems);

  useLayoutEffect(() => {
    navigation.setOptions({ title: bundle?.name ?? "Bundle" });
  }, [navigation, bundle]);

  if (!bundle) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Not found.</Text>
      </View>
    );
  }

  const confirmDelete = () => {
    Alert.alert(`Delete "${bundle.name}"?`, undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteBundle(bundle.id);
          router.back();
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={bundleItems}
        keyExtractor={(bi) => bi.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items yet. Add items from your library below.</Text>
          </View>
        }
        renderItem={({ item: bundleItem }) => {
          const masterItem = masterItems.find((m) => m.id === bundleItem.masterItemId);
          return (
            <Pressable
              style={styles.row}
              onLongPress={() =>
                Alert.alert("Remove item?", masterItem?.name, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Remove", style: "destructive", onPress: () => removeBundleItem(bundleItem.id) }
                ])
              }
            >
              <Text style={styles.rowName}>
                {masterItem?.name ?? "(deleted item)"}
                {bundleItem.quantity > 1 ? ` ×${bundleItem.quantity}` : ""}
              </Text>
              <Text style={styles.rowType}>{masterItem?.defaultType === "tagged" ? "Tagged" : "Manual"}</Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push(`/(app)/library/bundles/${bundleId}/add-item`)}
        >
          <Text style={styles.primaryButtonText}>+ Add Item</Text>
        </Pressable>
      </View>

      <Pressable onPress={confirmDelete} style={styles.deleteLink}>
        <Text style={styles.deleteLinkText}>Delete this {bundle.kind}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  empty: { marginTop: 60, alignItems: "center", paddingHorizontal: 40 },
  emptyText: { color: "#6C7A93", textAlign: "center", fontSize: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1D2536"
  },
  rowName: { color: "#F5F7FA", fontSize: 15, fontWeight: "500" },
  rowType: { color: "#6C7A93", fontSize: 12 },
  footer: { position: "absolute", bottom: 40, left: 16, right: 16 },
  primaryButton: { backgroundColor: "#4ADE80", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  primaryButtonText: { color: "#0B1220", fontWeight: "700", fontSize: 16 },
  deleteLink: { alignItems: "center", paddingBottom: 10 },
  deleteLinkText: { color: "#F87171", fontSize: 13 }
});
