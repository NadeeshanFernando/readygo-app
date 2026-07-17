// app/(app)/trips/archived.tsx
import React from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTripStore } from "@/store/tripStore";
import { useItemStore } from "@/store/itemStore";
import { TripCard } from "@/components/TripCard";

export default function ArchivedTripsScreen() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const trips = useTripStore((s) => (currentUser ? s.getArchivedTripsForUser(currentUser.id) : []));
  const unarchiveTrip = useTripStore((s) => s.unarchiveTrip);
  const items = useItemStore((s) => s.items);

  const confirmUnarchive = (tripId: string, title: string) => {
    Alert.alert(`Restore "${title}"?`, "This moves it back to your main trips list.", [
      { text: "Cancel", style: "cancel" },
      { text: "Restore", onPress: () => unarchiveTrip(tripId) }
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={[...trips].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No archived trips.</Text>
          </View>
        }
        renderItem={({ item: trip }) => (
          <View>
            <TripCard
              trip={trip}
              itemCount={items.filter((i) => i.tripId === trip.id).length}
              onPress={() => router.push(`/(app)/trips/${trip.id}`)}
            />
            <Pressable style={styles.restoreButton} onPress={() => confirmUnarchive(trip.id, trip.title)}>
              <Text style={styles.restoreButtonText}>Restore to active trips</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  empty: { marginTop: 60, alignItems: "center", paddingHorizontal: 40 },
  emptyText: { color: "#6C7A93", textAlign: "center", fontSize: 14 },
  restoreButton: {
    marginTop: -6,
    marginBottom: 14,
    alignItems: "center",
    backgroundColor: "#151C2C",
    borderWidth: 1,
    borderColor: "#232B3E",
    borderRadius: 10,
    paddingVertical: 10
  },
  restoreButtonText: { color: "#4ADE80", fontSize: 13, fontWeight: "600" }
});
