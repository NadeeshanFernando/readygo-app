// app/(app)/trips/index.tsx
import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTripStore } from "@/store/tripStore";
import { useItemStore } from "@/store/itemStore";
import { TripCard } from "@/components/TripCard";

export default function TripsListScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const trips = useTripStore((s) => (currentUser ? s.getActiveTripsForUser(currentUser.id) : []));
  const archivedCount = useTripStore((s) => (currentUser ? s.getArchivedTripsForUser(currentUser.id).length : 0));
  const items = useItemStore((s) => s.items);

  return (
    <View style={styles.container}>
      <FlatList
        data={[...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No trips yet. Create your first trip to get started.</Text>
          </View>
        }
        ListFooterComponent={
          archivedCount > 0 ? (
            <Pressable style={styles.archivedLink} onPress={() => router.push("/(app)/trips/archived")}>
              <Text style={styles.archivedLinkText}>View archived trips ({archivedCount})</Text>
            </Pressable>
          ) : null
        }
        renderItem={({ item: trip }) => (
          <TripCard
            trip={trip}
            itemCount={items.filter((i) => i.tripId === trip.id).length}
            onPress={() => router.push(`/(app)/trips/${trip.id}`)}
          />
        )}
      />

      <Link href="/(app)/trips/new" asChild>
        <Pressable style={styles.fab}>
          <Text style={styles.fabText}>+ New Trip</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  list: { padding: 16, paddingBottom: 100 },
  empty: { marginTop: 60, alignItems: "center", paddingHorizontal: 40 },
  emptyText: { color: "#6C7A93", textAlign: "center", fontSize: 14 },
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
  fabText: { color: "#0B1220", fontWeight: "700", fontSize: 15 },
  archivedLink: { alignItems: "center", paddingVertical: 16 },
  archivedLinkText: { color: "#9AA5B8", fontSize: 13, fontWeight: "600" }
});
