// src/components/TripCard.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Trip } from "@/types";

interface Props {
  trip: Trip;
  itemCount: number;
  onPress: () => void;
}

export function TripCard({ trip, itemCount, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.title}>{trip.title}</Text>
      {trip.destination ? <Text style={styles.subtitle}>{trip.destination}</Text> : null}
      <View style={styles.footerRow}>
        <Text style={styles.meta}>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </Text>
        {trip.startDate ? <Text style={styles.meta}>{trip.startDate}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#151C2C",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#232B3E"
  },
  title: { color: "#F5F7FA", fontSize: 17, fontWeight: "600" },
  subtitle: { color: "#9AA5B8", fontSize: 14, marginTop: 4 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  meta: { color: "#6C7A93", fontSize: 12 }
});
