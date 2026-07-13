// app/index.tsx
// Entry point at "/". No accounts/login — always heads straight into the
// app once the local profile is ready (root _layout ensures it exists).
import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { isHydrated, currentUser } = useAuth();

  if (!isHydrated || !currentUser) return null;

  return <Redirect href="/(app)/trips" />;
}
