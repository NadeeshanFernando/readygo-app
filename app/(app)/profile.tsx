// app/(app)/profile.tsx
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTripStore } from "@/store/tripStore";
import { useTagStore } from "@/store/tagStore";
import { usePremiumStore } from "@/store/premiumStore";
import {
  getPremiumType,
  getTrialDaysRemaining,
  getRemainingTrips,
  getRemainingAISuggestions
} from "@/services/premiumService";
import { sendTestNotification } from "@/services/reminderService";
import { BLE_TAGS_ENABLED } from "@/config/featureFlags";

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, updateName } = useAuth();
  const trips = useTripStore((s) => (currentUser ? s.getActiveTripsForUser(currentUser.id) : []));
  const tags = useTagStore((s) => s.tags);
  const [sendingTest, setSendingTest] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(currentUser?.name ?? "");

  // Subscribed (not just called) so this screen re-renders when premium
  // status or AI usage changes — e.g. right after using AI on another screen.
  usePremiumStore((s) => s.isProManual);
  usePremiumStore((s) => s.aiSuggestionsUsedThisMonth);

  const premiumType = getPremiumType();
  const trialDaysRemaining = getTrialDaysRemaining();
  const remainingTrips = getRemainingTrips(); // null = unlimited
  const remainingAI = getRemainingAISuggestions(); // null = unlimited

  const saveName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed) updateName(trimmed);
    setEditingName(false);
  };

  const handleTestNotification = async () => {
    setSendingTest(true);
    try {
      const result = await sendTestNotification(10);
      if (result.status === "scheduled") {
        Alert.alert(
          "Test notification sent",
          "You should see it in about 10 seconds. You can lock your phone or leave the app — it'll still arrive if notifications work on this device."
        );
      } else if (result.status === "permission_denied") {
        Alert.alert(
          "Notifications are off",
          "ReadyGo doesn't have permission to send notifications. Enable notifications for this app in your device's Settings, then try again."
        );
      } else {
        Alert.alert(
          "Couldn't send test notification",
          "Something went wrong. If you're running this in Expo Go, try a development build instead — some notification features are limited in Expo Go."
        );
      }
    } finally {
      setSendingTest(false);
    }
  };

  const renderPremiumCard = () => {
    if (premiumType === "PRO") {
      return (
        <View style={[styles.premiumCard, styles.premiumCardPro]}>
          <Text style={styles.premiumCardTitle}>ReadyGo Pro</Text>
          <Text style={styles.premiumCardSubtitle}>Thank you for supporting ReadyGo</Text>
        </View>
      );
    }
    if (premiumType === "TRIAL") {
      return (
        <View style={[styles.premiumCard, styles.premiumCardTrial]}>
          <Text style={styles.premiumCardTitle}>ReadyGo Pro Trial</Text>
          <Text style={styles.premiumCardSubtitle}>
            {trialDaysRemaining} {trialDaysRemaining === 1 ? "Day" : "Days"} Remaining
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.premiumCard, styles.premiumCardFree]}>
        <Text style={styles.premiumCardTitle}>ReadyGo Free</Text>
        <Pressable style={styles.upgradeButton} onPress={() => router.push("/(app)/upgrade")}>
          <Text style={styles.upgradeButtonText}>Upgrade to ReadyGo Pro</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {editingName ? (
        <View style={styles.editNameRow}>
          <TextInput
            style={styles.nameInput}
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="Your name"
            placeholderTextColor="#6C7A93"
            autoFocus
          />
          <Pressable onPress={saveName} style={styles.saveNameButton}>
            <Text style={styles.saveNameButtonText}>Save</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setNameDraft(currentUser?.name ?? "");
            setEditingName(true);
          }}
        >
          <Text style={styles.name}>{currentUser?.name} ✎</Text>
        </Pressable>
      )}
      <Text style={styles.hint}>This is just a display name for this device — no account or login needed.</Text>

      {renderPremiumCard()}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{trips.length}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        {BLE_TAGS_ENABLED && (
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{tags.length}</Text>
            <Text style={styles.statLabel}>Registered Tags</Text>
          </View>
        )}
      </View>

      <View style={styles.premiumSection}>
        <Text style={styles.premiumSectionTitle}>Premium</Text>
        <View style={styles.premiumRow}>
          <Text style={styles.premiumRowLabel}>Current Plan</Text>
          <Text style={styles.premiumRowValue}>
            {premiumType === "TRIAL" ? "Trial" : premiumType === "PRO" ? "Pro" : "Free"}
          </Text>
        </View>
        <View style={styles.premiumRow}>
          <Text style={styles.premiumRowLabel}>AI Remaining</Text>
          <Text style={styles.premiumRowValue}>{remainingAI === null ? "Unlimited" : remainingAI}</Text>
        </View>
        <View style={styles.premiumRow}>
          <Text style={styles.premiumRowLabel}>Trips Remaining</Text>
          <Text style={styles.premiumRowValue}>{remainingTrips === null ? "Unlimited" : remainingTrips}</Text>
        </View>
      </View>

      <Pressable style={styles.testButton} onPress={handleTestNotification} disabled={sendingTest}>
        <Text style={styles.testButtonText}>
          {sendingTest ? "Sending…" : "Send test notification (10s)"}
        </Text>
      </Pressable>
      <Text style={styles.testHint}>
        Use this to check whether reminders work on this device before troubleshooting a specific trip.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220", padding: 24, alignItems: "center", paddingTop: 60 },
  name: { color: "#F5F7FA", fontSize: 22, fontWeight: "700" },
  hint: { color: "#6C7A93", fontSize: 12, marginTop: 8, textAlign: "center", paddingHorizontal: 20 },
  editNameRow: { flexDirection: "row", alignItems: "center", gap: 8, width: "100%" },
  nameInput: {
    flex: 1,
    backgroundColor: "#151C2C",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#232B3E",
    color: "#F5F7FA",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16
  },
  saveNameButton: { backgroundColor: "#4ADE80", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  saveNameButtonText: { color: "#0B1220", fontWeight: "700" },
  premiumCard: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginTop: 24,
    borderWidth: 1
  },
  premiumCardTrial: { backgroundColor: "#123B2A", borderColor: "#1F5D3E" },
  premiumCardPro: { backgroundColor: "#1F2B12", borderColor: "#3D5A1F" },
  premiumCardFree: { backgroundColor: "#151C2C", borderColor: "#232B3E" },
  premiumCardTitle: { color: "#F5F7FA", fontSize: 18, fontWeight: "700" },
  premiumCardSubtitle: { color: "#9AA5B8", fontSize: 13, marginTop: 4 },
  upgradeButton: { backgroundColor: "#4ADE80", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 12 },
  upgradeButtonText: { color: "#0B1220", fontWeight: "700", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 16, marginTop: 20, width: "100%" },
  statBox: {
    flex: 1,
    backgroundColor: "#151C2C",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#232B3E"
  },
  statNumber: { color: "#4ADE80", fontSize: 24, fontWeight: "700" },
  statLabel: { color: "#9AA5B8", fontSize: 12, marginTop: 4 },
  premiumSection: {
    width: "100%",
    backgroundColor: "#151C2C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#232B3E",
    padding: 18,
    marginTop: 16
  },
  premiumSectionTitle: { color: "#9AA5B8", fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 10 },
  premiumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  premiumRowLabel: { color: "#9AA5B8", fontSize: 14 },
  premiumRowValue: { color: "#F5F7FA", fontSize: 14, fontWeight: "600" },
  testButton: {
    backgroundColor: "#151C2C",
    borderWidth: 1,
    borderColor: "#232B3E",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 24,
    width: "100%"
  },
  testButtonText: { color: "#F5F7FA", fontSize: 14, fontWeight: "600" },
  testHint: { color: "#6C7A93", fontSize: 12, marginTop: 8, textAlign: "center", paddingHorizontal: 20 }
});
