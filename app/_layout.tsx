// app/_layout.tsx
import React, { useEffect } from "react";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { initNotificationChannel } from "@/services/reminderService";

// ReadyGo has no login/accounts — this just makes sure the single local
// device profile exists (created once, automatically) before rendering
// anything, then always shows the (app) group directly.
export default function RootLayout() {
  const { isHydrated, currentUser, ensureLocalUser } = useAuth();

  useEffect(() => {
    initNotificationChannel();
  }, []);

  useEffect(() => {
    if (isHydrated && !currentUser) {
      ensureLocalUser();
    }
  }, [isHydrated, currentUser]);

  if (!isHydrated || !currentUser) {
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
