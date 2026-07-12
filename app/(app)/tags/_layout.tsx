// app/(app)/tags/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function TagsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1220" },
        headerTintColor: "#F5F7FA",
        contentStyle: { backgroundColor: "#0B1220" }
      }}
    >
      <Stack.Screen name="index" options={{ title: "My Tags" }} />
      <Stack.Screen name="scan" options={{ title: "Register a Tag", presentation: "modal" }} />
    </Stack>
  );
}
