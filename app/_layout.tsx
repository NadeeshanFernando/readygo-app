// app/_layout.tsx
import React, { useEffect } from "react";
import { Redirect, Slot, useSegments, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { initNotificationChannel } from "@/services/reminderService";

// This root layout only decides which top-level group ((auth) vs (app))
// should be shown, based on auth state. Each group has its own layout.
export default function RootLayout() {
  const { isAuthenticated, isHydrated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initNotificationChannel();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(app)/trips");
    }
  }, [isAuthenticated, isHydrated, segments]);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B1220" }}>
        <ActivityIndicator size="large" color="#4ADE80" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}
