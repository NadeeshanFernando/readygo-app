// app/(app)/tags/index.tsx
import React from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTagStore } from "@/store/tagStore";
import { TagBadge } from "@/components/TagBadge";

export default function TagsListScreen() {
  const tags = useTagStore((s) => s.tags);
  const deleteTag = useTagStore((s) => s.deleteTag);

  const confirmDelete = (tagId: string) => {
    Alert.alert("Remove tag?", "This will unregister the tag from your account.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteTag(tagId) }
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tags}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tags registered yet. Scan a QR code on a ReadyGo tag to add one.</Text>
          </View>
        }
        renderItem={({ item: tag }) => (
          <Pressable style={styles.card} onLongPress={() => confirmDelete(tag.id)}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{tag.nickname || tag.qrCode}</Text>
              <TagBadge
                label={tag.authStatus === "verified" ? "Verified genuine" : "Unverified"}
                tone={tag.authStatus === "verified" ? "success" : "warning"}
              />
            </View>
            <Text style={styles.meta}>QR: {tag.qrCode}</Text>
            <Text style={styles.meta}>BLE: {tag.bleId}</Text>
            <Text style={styles.status}>
              {tag.assignedItemId ? "Assigned to an item" : "Not assigned yet"}
            </Text>
          </Pressable>
        )}
      />

      <Link href="/(app)/tags/scan" asChild>
        <Pressable style={styles.fab}>
          <Text style={styles.fabText}>+ Register Tag</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  empty: { marginTop: 60, alignItems: "center", paddingHorizontal: 40 },
  emptyText: { color: "#6C7A93", textAlign: "center", fontSize: 14 },
  card: {
    backgroundColor: "#151C2C",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232B3E"
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  name: { color: "#F5F7FA", fontSize: 16, fontWeight: "600", flex: 1 },
  meta: { color: "#6C7A93", fontSize: 12, marginTop: 4 },
  status: { color: "#9AA5B8", fontSize: 12, marginTop: 6, fontStyle: "italic" },
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
