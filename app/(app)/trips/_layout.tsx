// app/(app)/trips/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function TripsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1220" },
        headerTintColor: "#F5F7FA",
        contentStyle: { backgroundColor: "#0B1220" }
      }}
    >
      <Stack.Screen name="index" options={{ title: "My Trips" }} />
      <Stack.Screen name="new" options={{ title: "New Trip", presentation: "modal" }} />
      <Stack.Screen name="archived" options={{ title: "Archived Trips" }} />
      <Stack.Screen name="[tripId]/index" options={{ title: "Trip" }} />
      <Stack.Screen name="[tripId]/edit" options={{ title: "Edit Trip", presentation: "modal" }} />
      <Stack.Screen name="[tripId]/add-item" options={{ title: "Add Item", presentation: "modal" }} />
      <Stack.Screen name="[tripId]/apply-bundle" options={{ title: "Apply Pack or Template", presentation: "modal" }} />
      <Stack.Screen name="[tripId]/check" options={{ title: "Check Everything" }} />
    </Stack>
  );
}
