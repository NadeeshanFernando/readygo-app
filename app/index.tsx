// app/index.tsx
// Entry point at "/". Immediately redirects into the correct group;
// the root _layout also guards deep links, but this covers cold start.
import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { isAuthenticated, isHydrated } = useAuth();

  if (!isHydrated) return null;

  return <Redirect href={isAuthenticated ? "/(app)/trips" : "/(auth)/login"} />;
}
