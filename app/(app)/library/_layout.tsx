// app/(app)/library/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function LibraryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1220" },
        headerTintColor: "#F5F7FA",
        contentStyle: { backgroundColor: "#0B1220" }
      }}
    >
      <Stack.Screen name="index" options={{ title: "Library" }} />
      <Stack.Screen name="items/new" options={{ title: "New Item", presentation: "modal" }} />
      <Stack.Screen name="items/[itemId]" options={{ title: "Edit Item", presentation: "modal" }} />
      <Stack.Screen name="bundles/new" options={{ title: "New Bundle", presentation: "modal" }} />
      <Stack.Screen name="bundles/[bundleId]/index" options={{ title: "Bundle" }} />
      <Stack.Screen name="bundles/[bundleId]/add-item" options={{ title: "Add Item to Bundle", presentation: "modal" }} />
    </Stack>
  );
}
