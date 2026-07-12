// app/(auth)/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1220" },
        headerTintColor: "#F5F7FA",
        contentStyle: { backgroundColor: "#0B1220" }
      }}
    >
      <Stack.Screen name="login" options={{ title: "Log In" }} />
      <Stack.Screen name="register" options={{ title: "Create Account" }} />
    </Stack>
  );
}
