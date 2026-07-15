// app/(app)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { BLE_TAGS_ENABLED } from "@/config/featureFlags";

function TabIcon({ symbol }: { symbol: string }) {
  return <Text style={{ fontSize: 20 }}>{symbol}</Text>;
}

export default function AppLayout() {
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
          // Stage 1 launch: hidden from the tab bar, but the route/code is
          // fully intact — flip BLE_TAGS_ENABLED back to true for Stage 2,
          // no other changes needed here.
          href: BLE_TAGS_ENABLED ? undefined : null
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: () => <TabIcon symbol="👤" /> }}
      />
    </Tabs>
  );
}
