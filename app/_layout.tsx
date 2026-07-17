// app/_layout.tsx
import React, { useEffect, useRef, useState } from "react";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Image, Text, StyleSheet, Alert } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useAuth } from "@/hooks/useAuth";
import { useExpiryStore } from "@/store/expiryStore";
import { usePremiumStore } from "@/store/premiumStore";
import { getTrialDaysRemaining } from "@/services/premiumService";
import { initNotificationChannel } from "@/services/reminderService";

// The native splash (assets/icon.png, configured via the expo-splash-screen
// plugin in app.json) only ever shows the plain icon briefly, before JS
// even loads — native splash screens can't reliably show custom text
// without platform-specific safe-zone clipping issues (we hit this
// directly). Once JS is ready, we hide the native splash almost
// immediately and replace it with our own in-app SplashView below, which
// is real React text — no image regeneration ever needed to change wording.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Safe to ignore — e.g. if Fast Refresh calls this a second time.
});

const MIN_SPLASH_MS = 3000; // always show our custom splash for at least this long
const MAX_WAIT_MS = 8000; // safety net if something stalls — never stuck forever

// Self-expiring TEST BUILD setting — set to null to disable entirely for a
// real release. Clock starts the first time whoever installs this build
// actually opens it, not from when you built/published it.
// Self-expiring TEST BUILD setting — set to a duration in ms to make the
// app self-disable that long after first launch (useful for sending a
// friend a temporary test build). MUST be null for any build heading to
// real users — this includes Play Store closed/production testing, since
// your 12 required testers need the app working for the full 14 days.
const TEST_BUILD_EXPIRY_MS: number | null = null;

function SplashView() {
  return (
    <View style={styles.splashContainer}>
      <Image source={require("../assets/icon.png")} style={styles.splashIcon} resizeMode="contain" />
      <Text style={styles.splashTitle}>ReadyGo</Text>
      <Text style={styles.splashTagline}>Never leave without your essentials.</Text>
    </View>
  );
}

function ExpiredView() {
  return (
    <View style={styles.splashContainer}>
      <Image source={require("../assets/icon.png")} style={styles.splashIcon} resizeMode="contain" />
      <Text style={styles.splashTitle}>Test period ended</Text>
      <Text style={styles.splashTagline}>
        This test build of ReadyGo is no longer active. Ask for a fresh build if you'd like to keep trying it out.
      </Text>
    </View>
  );
}

// ReadyGo has no login/accounts — this just makes sure the single local
// device profile exists (created once, automatically) before rendering
// anything, then always shows the (app) group directly.
export default function RootLayout() {
  const { isHydrated, currentUser, ensureLocalUser } = useAuth();
  const { isHydrated: expiryHydrated, ensureFirstLaunchRecorded, isExpired } = useExpiryStore();
  const hasSeenWelcomeDialog = usePremiumStore((s) => s.hasSeenWelcomeDialog);
  const markWelcomeDialogSeen = usePremiumStore((s) => s.markWelcomeDialogSeen);
  const premiumHydrated = usePremiumStore((s) => s.isHydrated);
  const mountTimeRef = useRef(Date.now());
  const [readyToReveal, setReadyToReveal] = useState(false);
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

  // Hide the native splash as soon as this component has mounted at all —
  // our own SplashView (rendered below) takes over the visual from here,
  // so there's no reason to keep the native one up any longer than needed.
  useEffect(() => {
    SplashScreen.hideAsync()
      .catch(() => {})
      .finally(() => setNativeSplashHidden(true));
  }, []);

  useEffect(() => {
    initNotificationChannel();
  }, []);

  useEffect(() => {
    if (isHydrated && !currentUser) {
      ensureLocalUser();
    }
  }, [isHydrated, currentUser]);

  // Record the first-launch timestamp once, as soon as we know it hasn't
  // been recorded yet — this is what the expiry countdown is measured from.
  useEffect(() => {
    if (expiryHydrated && TEST_BUILD_EXPIRY_MS !== null) {
      ensureFirstLaunchRecorded();
    }
  }, [expiryHydrated]);

  // Once the app is actually ready, still wait out the remainder of the
  // minimum splash duration before revealing the real app — e.g. if ready
  // in 400ms, we still wait the other ~2.6s so SplashView always shows for
  // a consistent, deliberate 3 seconds rather than flashing briefly.
  useEffect(() => {
    if (isHydrated && currentUser && !readyToReveal) {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(MIN_SPLASH_MS - elapsed, 0);
      const timer = setTimeout(() => setReadyToReveal(true), remaining);
      return () => clearTimeout(timer);
    }
  }, [isHydrated, currentUser, readyToReveal]);

  // Safety net: if something unexpected stalls hydration/profile creation
  // well past the minimum splash time, never leave the user stuck forever.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!readyToReveal) {
        console.warn("ReadyGo: app took too long to become ready — revealing anyway.");
        setReadyToReveal(true);
      }
    }, MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [readyToReveal]);

  // First-launch welcome dialog — only ever shows once, right after the app
  // is actually visible (never stack it behind the splash).
  useEffect(() => {
    if (readyToReveal && premiumHydrated && !hasSeenWelcomeDialog) {
      const days = getTrialDaysRemaining();
      Alert.alert(
        "🎉 Welcome to ReadyGo Pro",
        `Enjoy every premium feature FREE for ${days} days.\n\nThen continue using ReadyGo Free or upgrade anytime.`,
        [{ text: "Got it", onPress: markWelcomeDialogSeen }]
      );
    }
  }, [readyToReveal, premiumHydrated, hasSeenWelcomeDialog]);

  if (!nativeSplashHidden || !readyToReveal) {
    return <SplashView />;
  }

  if (TEST_BUILD_EXPIRY_MS !== null && expiryHydrated && isExpired(TEST_BUILD_EXPIRY_MS)) {
    return <ExpiredView />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40
  },
  splashIcon: { width: 140, height: 140, marginBottom: 24 },
  splashTitle: { color: "#F5F7FA", fontSize: 34, fontWeight: "700" },
  splashTagline: { color: "#9AA5B8", fontSize: 15, marginTop: 8, textAlign: "center" }
});
