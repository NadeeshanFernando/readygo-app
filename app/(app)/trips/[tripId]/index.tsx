// app/(app)/trips/[tripId]/index.tsx
import React, { useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useTripStore } from "@/store/tripStore";
import { useItemStore } from "@/store/itemStore";
import { useTagStore } from "@/store/tagStore";
import { ItemRow } from "@/components/ItemRow";
import { Trip } from "@/types";
import { duplicateTrip } from "@/services/duplicateTrip";
import { useMasterItemStore } from "@/store/masterItemStore";
import { useAuth } from "@/hooks/useAuth";
import { getAiSuggestions, recordSuggestionFeedback, AiSuggestion } from "@/services/aiSuggestionService";
import { usePremiumStore } from "@/store/premiumStore";
import { canUseAI, recordAiSuggestionsUsed } from "@/services/premiumService";

function ReminderStatusBadge({ trip }: { trip: Trip }) {
  if (trip.reminderStatus === "scheduled" && trip.reminderScheduledFor) {
    const when = new Date(trip.reminderScheduledFor).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    return (
      <View style={[badgeStyles.box, badgeStyles.ok]}>
        <Text style={badgeStyles.text}>🔔 Reminder set for {when}</Text>
      </View>
    );
  }

  if (trip.reminderStatus === "permission_denied") {
    return (
      <View style={[badgeStyles.box, badgeStyles.warn]}>
        <Text style={badgeStyles.text}>
          🔕 Reminder couldn't be set — notifications are off. Enable them in device settings, then edit this trip.
        </Text>
      </View>
    );
  }

  if (trip.reminderStatus === "in_the_past" || trip.reminderStatus === "error") {
    return (
      <View style={[badgeStyles.box, badgeStyles.warn]}>
        <Text style={badgeStyles.text}>🔕 Reminder couldn't be scheduled. Edit this trip to try again.</Text>
      </View>
    );
  }

  return null;
}

const badgeStyles = StyleSheet.create({
  box: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  ok: { backgroundColor: "#123B2A", borderColor: "#1F5D3E" },
  warn: { backgroundColor: "#3B3312", borderColor: "#5D4E23" },
  text: { color: "#F5F7FA", fontSize: 12 }
});

export default function TripDetailScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const trip = useTripStore((s) => s.getTrip(tripId));
  const deleteTrip = useTripStore((s) => s.deleteTrip);
  const archiveTrip = useTripStore((s) => s.archiveTrip);

  const items = useItemStore((s) => s.getItemsForTrip(tripId));
  const toggleManualChecked = useItemStore((s) => s.toggleManualChecked);
  const deleteItem = useItemStore((s) => s.deleteItem);
  const deleteItemsForTrip = useItemStore((s) => s.deleteItemsForTrip);

  const tags = useTagStore((s) => s.tags);
  const setAssignedItem = useTagStore((s) => s.setAssignedItem);

  const { currentUser } = useAuth();
  const findByName = useMasterItemStore((s) => s.findByName);
  const addMasterItem = useMasterItemStore((s) => s.addMasterItem);
  const addItem = useItemStore((s) => s.addItem);

  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  // Subscribed (not just called as plain functions) so this screen
  // re-renders immediately when usage/premium status changes — e.g. right
  // after this same screen calls recordAiSuggestionsUsed() below.
  usePremiumStore((s) => s.aiSuggestionsUsedThisMonth);
  usePremiumStore((s) => s.isProManual);

  // Suggestions are destination-specific — if the trip's destination gets
  // edited (or we're now looking at a different trip whose screen instance
  // got reused), any suggestions/errors from before are stale and must not
  // linger. Without this, editing "Japan" -> "China" kept showing "Suggested
  // for Japan" until fully navigating away and back.
  useEffect(() => {
    setAiSuggestions([]);
    setAiUnavailable(false);
  }, [tripId, trip?.destination]);

  useLayoutEffect(() => {
    if (!trip) return; // avoid a native header update racing with this screen being torn down
    navigation.setOptions({
      title: trip.title,
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <Pressable onPress={() => router.push(`/(app)/trips/${tripId}/edit`)}>
            <Text style={{ color: "#4ADE80", fontWeight: "600" }}>Edit</Text>
          </Pressable>
          <Pressable onPress={openMoreMenu} hitSlop={8}>
            <Text style={{ color: "#9AA5B8", fontWeight: "700", fontSize: 18 }}>⋯</Text>
          </Pressable>
        </View>
      )
    });
  }, [navigation, trip, tripId]);

  if (!trip) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Trip not found.</Text>
      </View>
    );
  }

  const confirmDeleteTrip = () => {
    Alert.alert("Delete trip?", "This will remove the trip and all its checklist items.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          // Navigate away FIRST, before touching the store. Deleting the
          // trip while this screen is still mounted causes `trip` to become
          // undefined mid-render, which re-fires the header useLayoutEffect
          // right as the native Screen fragment is being torn down —
          // react-native-screens can crash on that race
          // ("ScreenStackFragment added into a non-stack container").
          // Navigating first means this screen is already transitioning
          // away before any of that data changes.
          router.replace("/(app)/trips");
          // Free up any tags this trip's items had claimed, then remove
          // the trip and its items. Deliberately not awaited — the
          // navigation above doesn't need to wait on this, and this
          // screen's own state no longer matters once we've navigated.
          items.forEach((item) => {
            if (item.tagId) setAssignedItem(item.tagId, undefined);
          });
          deleteItemsForTrip(trip.id);
          deleteTrip(trip.id);
        }
      }
    ]);
  };

  const confirmDeleteItem = (itemId: string) => {
    Alert.alert("Remove item?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const item = items.find((i) => i.id === itemId);
          if (item?.tagId) setAssignedItem(item.tagId, undefined);
          deleteItem(itemId);
        }
      }
    ]);
  };

  const handleDuplicateTrip = async () => {
    const newTrip = await duplicateTrip(trip);
    router.push(`/(app)/trips/${newTrip.id}/edit`);
  };

  const handleArchiveTrip = () => {
    Alert.alert(
      "Archive this trip?",
      "Archived trips are hidden from your main list but not deleted — you can view and restore them anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: () => {
            // Same navigate-first pattern as delete — avoids a header
            // re-render racing with this screen's native teardown.
            router.replace("/(app)/trips");
            archiveTrip(trip.id);
          }
        }
      ]
    );
  };

  const openMoreMenu = () => {
    Alert.alert("Trip options", undefined, [
      { text: "Duplicate this trip", onPress: handleDuplicateTrip },
      { text: "Archive this trip", onPress: handleArchiveTrip },
      { text: "Delete this trip", style: "destructive", onPress: confirmDeleteTrip },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const openAddMenu = () => {
    Alert.alert("Add to this trip", undefined, [
      { text: "Single item", onPress: () => router.push(`/(app)/trips/${tripId}/add-item`) },
      { text: "Pack or Template", onPress: () => router.push(`/(app)/trips/${tripId}/apply-bundle`) },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const handleFetchAiSuggestions = async () => {
    if (!currentUser) return;

    if (!canUseAI()) {
      Alert.alert(
        "Upgrade to Continue Using AI",
        "You've used all 10 free AI suggestions this month. Upgrade to ReadyGo Pro for unlimited suggestions.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/(app)/upgrade") }
        ]
      );
      return;
    }

    setAiLoading(true);
    setAiUnavailable(false);
    try {
      const result = await getAiSuggestions({
        userId: currentUser.id,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
        notes: trip.notes,
        existingItemNames: items.map((i) => i.name)
      });
      if (result.status === "ok") {
        setAiSuggestions(result.suggestions);
        // Counts individual suggestions actually shown, not the request itself.
        if (result.suggestions.length > 0) recordAiSuggestionsUsed(result.suggestions.length);
        if (result.suggestions.length === 0) {
          Alert.alert("No new suggestions", "Looks like your checklist already covers the essentials.");
        }
      } else {
        setAiUnavailable(true);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptSuggestion = (suggestion: AiSuggestion) => {
    if (!currentUser) return;
    const matches = findByName(currentUser.id, suggestion.name);
    const exact = matches.find((m) => m.name.toLowerCase() === suggestion.name.toLowerCase());
    const masterItem =
      exact ?? addMasterItem({ userId: currentUser.id, name: suggestion.name, defaultType: "manual", category: suggestion.category });

    addItem({ tripId, name: suggestion.name, type: "manual", quantity: 1, masterItemId: masterItem.id });
    recordSuggestionFeedback({ userId: currentUser.id, itemName: suggestion.name, accepted: true, destination: trip.destination });
    setAiSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));
  };

  const handleRejectSuggestion = (suggestion: AiSuggestion) => {
    if (currentUser) {
      recordSuggestionFeedback({ userId: currentUser.id, itemName: suggestion.name, accepted: false, destination: trip.destination });
    }
    setAiSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));
  };

  return (
    <View style={styles.container}>
      {trip.reminderEnabled && <ReminderStatusBadge trip={trip} />}

      {trip.destination && (
        <View style={styles.aiBox}>
          {aiSuggestions.length === 0 ? (
            <Pressable style={styles.aiButton} onPress={handleFetchAiSuggestions} disabled={aiLoading}>
              {aiLoading ? (
                <ActivityIndicator size="small" color="#4ADE80" />
              ) : (
                <Text style={styles.aiButtonText}>
                  {canUseAI() ? "✨ Get AI Suggestions" : "Upgrade to Continue Using AI"}
                </Text>
              )}
            </Pressable>
          ) : (
            <View>
              <Text style={styles.aiTitle}>Suggested for {trip.destination}</Text>
              <ScrollView
                style={styles.suggestionScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={aiSuggestions.length > 3}
              >
                {aiSuggestions.map((s) => (
                  <View key={s.name} style={styles.suggestionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionName}>{s.name}</Text>
                      <Text style={styles.suggestionReason}>{s.reason}</Text>
                    </View>
                    <Pressable onPress={() => handleAcceptSuggestion(s)} style={styles.acceptButton}>
                      <Text style={styles.acceptButtonText}>Add</Text>
                    </Pressable>
                    <Pressable onPress={() => handleRejectSuggestion(s)} style={styles.rejectButton}>
                      <Text style={styles.rejectButtonText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          {aiUnavailable && (
            <Text style={styles.aiUnavailableText}>
              AI suggestions aren't available right now.
            </Text>
          )}
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items yet. Add your first packing item.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            assignedTag={tags.find((t) => t.id === item.tagId)}
            onToggleManual={() => toggleManualChecked(item.id)}
            onLongPress={() => confirmDeleteItem(item.id)}
          />
        )}
      />

      <View style={styles.footer}>
        <Pressable style={styles.secondaryButton} onPress={openAddMenu}>
          <Text style={styles.secondaryButtonText}>+ Add Item</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => router.push(`/(app)/trips/${tripId}/check`)}>
          <Text style={styles.primaryButtonText}>Check Everything</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  empty: { marginTop: 60, alignItems: "center", paddingHorizontal: 40 },
  emptyText: { color: "#6C7A93", textAlign: "center", fontSize: 14 },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    gap: 10
  },
  secondaryButton: {
    backgroundColor: "#151C2C",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#232B3E"
  },
  secondaryButtonText: { color: "#F5F7FA", fontWeight: "600" },
  primaryButton: {
    backgroundColor: "#4ADE80",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center"
  },
  primaryButtonText: { color: "#0B1220", fontWeight: "700", fontSize: 16 },
  aiBox: { marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  aiButton: {
    backgroundColor: "#151C2C",
    borderWidth: 1,
    borderColor: "#232B3E",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  aiButtonText: { color: "#4ADE80", fontWeight: "600", fontSize: 14 },
  aiTitle: { color: "#9AA5B8", fontSize: 12, marginBottom: 8, textTransform: "uppercase" },
  suggestionScroll: { maxHeight: 260 },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151C2C",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#232B3E",
    padding: 12,
    marginBottom: 8,
    gap: 8
  },
  suggestionName: { color: "#F5F7FA", fontSize: 14, fontWeight: "600" },
  suggestionReason: { color: "#6C7A93", fontSize: 12, marginTop: 2 },
  acceptButton: { backgroundColor: "#123B2A", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  acceptButtonText: { color: "#4ADE80", fontWeight: "700", fontSize: 12 },
  rejectButton: { paddingHorizontal: 8, paddingVertical: 8 },
  rejectButtonText: { color: "#6C7A93", fontSize: 14 },
  aiUnavailableText: { color: "#6C7A93", fontSize: 11, marginTop: 8, textAlign: "center" }
});
