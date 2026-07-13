// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useAuth } from "@/hooks/useAuth";
import { initNotificationChannel } from "@/services/reminderService";

// Keep the native splash screen (assets/splash-icon.png, configured via the
// expo-splash-screen plugin in app.json) visible past its default auto-hide
// point, until the app has actually finished loading below. This is the
// officially-documented usage for this specific API — calling it here, at
// module scope, before the component even renders — unlike the earlier
// bug we hit with expo-notifications, where a native call at import time
// was accidental and crashed. This one is meant to run this early.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Safe to ignore — e.g. if Fast Refresh calls this a second time.
});

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

  useEffect(() => {
    if (isHydrated && currentUser) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isHydrated, currentUser]);

  // Safety net: if something unexpected stalls hydration/profile creation,
  // never leave the user stuck behind the splash forever. Forces the splash
  // to hide and the real UI to render after 5s regardless.
  const [forceReveal, setForceReveal] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isHydrated || !currentUser) {
        console.warn("ReadyGo: app took too long to become ready — forcing splash to hide anyway.");
        SplashScreen.hideAsync().catch(() => {});
        setForceReveal(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isHydrated, currentUser]);

  if ((!isHydrated || !currentUser) && !forceReveal) {
    // Render nothing — the native splash screen is still covering the
    // screen at this point, so there's nothing for the user to see here.
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}
