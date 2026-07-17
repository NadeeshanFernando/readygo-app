// app/(app)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { BLE_TAGS_ENABLED } from "@/config/featureFlags";
import { usePremiumStore } from "@/store/premiumStore";
import { canUseBleTags } from "@/services/premiumService";

function TabIcon({ symbol }: { symbol: string }) {
  return <Text style={{ fontSize: 20 }}>{symbol}</Text>;
}

export default function AppLayout() {
  // Subscribed so the Tags tab's visibility re-evaluates live once
  // BLE_TAGS_ENABLED flips on in Stage 2 and premium status changes —
  // currently a no-op since BLE_TAGS_ENABLED is false regardless.
  usePremiumStore((s) => s.isProManual);

  const tagsTabVisible = BLE_TAGS_ENABLED && canUseBleTags();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1220" },
        headerTintColor: "#F5F7FA",
        tabBarStyle: { backgroundColor: "#0B1220", borderTopColor: "#232B3E" },
        tabBarActiveTintColor: "#4ADE80",
        tabBarInactiveTintColor: "#6C7A93"
      }}
    >
      <Tabs.Screen
        name="trips"
        options={{ title: "Trips", tabBarIcon: () => <TabIcon symbol="🧳" /> }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: "Library", tabBarIcon: () => <TabIcon symbol="📚" /> }}
      />
      <Tabs.Screen
        name="tags"
        options={{
          title: "Tags",
          tabBarIcon: () => <TabIcon symbol="📡" />,
          // Stage 1 launch: hidden from the tab bar regardless of premium
          // status (BLE_TAGS_ENABLED is false). Stage 2: flip the flag, and
          // this becomes Pro-gated automatically — Free/expired-trial users
          // won't see the tab even then, only Trial/Pro users will.
          href: tagsTabVisible ? undefined : null
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: () => <TabIcon symbol="👤" /> }}
      />
      <Tabs.Screen
        name="upgrade"
        options={{ title: "Upgrade to Pro", href: null }}
      />
    </Tabs>
  );
}
