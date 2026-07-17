// app/(app)/trips/new.tsx
import React, { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTripStore } from "@/store/tripStore";
import { canCreateTrip } from "@/services/premiumService";
import { DateField } from "@/components/DateField";
import { TimeField } from "@/components/TimeField";
import { ReminderTimingField } from "@/components/ReminderTimingField";
import { formatReminderLeadTime, minutesUntilTripStart } from "@/utils/reminderFormat";
import { presentReminderOutcome } from "@/utils/reminderAlert";

interface FormData {
  title: string;
  destination: string;
  notes: string;
}

export default function NewTripScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const addTrip = useTripStore((s) => s.addTrip);
  const isTitleTaken = useTripStore((s) => s.isTitleTaken);

  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [startTime, setStartTime] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(1440);
  const [submitting, setSubmitting] = useState(false);
  // A ref lock in addition to the state above: state updates aren't
  // synchronous, so two rapid taps can both pass the `submitting` check
  // before the first re-render commits. This ref blocks the second tap
  // immediately, regardless of render timing.
  const isSubmittingRef = useRef(false);

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: { title: "", destination: "", notes: "" }
  });

  const onSubmit = async (data: FormData) => {
    if (!currentUser || isSubmittingRef.current) return;

    if (!canCreateTrip()) {
      Alert.alert(
        "Free Plan Limit Reached",
        "Free users can have up to 5 active trips. Archive or delete an existing trip or upgrade to ReadyGo Pro.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/(app)/upgrade") }
        ]
      );
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const maxMinutes = minutesUntilTripStart(startDate, startTime);
      // Safety net: if time passed while the form was open, clamp rather
      // than schedule a reminder that's already in the past.
      const safeReminderMinutes =
        maxMinutes !== null ? Math.min(reminderMinutesBefore, Math.max(maxMinutes, 1)) : reminderMinutesBefore;

      const trip = await addTrip(currentUser.id, {
        title: data.title.trim(),
        destination: data.destination.trim() || undefined,
        startDate,
        startTime,
        endDate,
        notes: data.notes.trim() || undefined,
        reminderEnabled: reminderEnabled && !!startDate && (maxMinutes === null || maxMinutes > 0),
        reminderMinutesBefore: safeReminderMinutes
      });
      presentReminderOutcome(trip);
      router.replace(`/(app)/trips/${trip.id}`);
    } finally {
      setSubmitting(false);
      // Deliberately NOT resetting isSubmittingRef.current back to false here:
      // once a trip has been created from this screen, this form instance
      // should never submit again even if the user somehow gets back to it
      // before navigation completes (e.g. slow router.replace).
    }
  };

  const maxReminderMinutes = minutesUntilTripStart(startDate, startTime);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.label}>Trip title</Text>
      <Controller
        control={control}
        name="title"
        rules={{
          required: "Title is required",
          validate: (value) =>
            !currentUser || !isTitleTaken(currentUser.id, value) || "You already have a trip with this name"
        }}
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="e.g. Tokyo Business Trip"
            placeholderTextColor="#6C7A93"
            value={value}
            onChangeText={onChange}
          />
        )}
      />
      {errors.title && <Text style={styles.error}>{errors.title.message}</Text>}

      <Text style={styles.label}>Destination</Text>
      <Controller
        control={control}
        name="destination"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="e.g. Tokyo, Japan"
            placeholderTextColor="#6C7A93"
            value={value}
            onChangeText={onChange}
          />
        )}
      />

      <DateField label="Start date" value={startDate} onChange={setStartDate} />
      {startDate && (
        <TimeField
          label="Start time (optional)"
          value={startTime}
          onChange={setStartTime}
        />
      )}
      <DateField label="End date" value={endDate} onChange={setEndDate} minimumDate={startDate ? new Date(`${startDate}T00:00:00`) : undefined} />

      {startDate && (
        <View style={styles.reminderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>Remind me to check everything</Text>
            <Text style={styles.reminderSub}>
              {reminderEnabled
                ? `Notifies you ${formatReminderLeadTime(reminderMinutesBefore)} before your start date`
                : "Reminder is off for this trip"}
            </Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ false: "#232B3E", true: "#1F5D3E" }}
            thumbColor={reminderEnabled ? "#4ADE80" : "#6C7A93"}
          />
        </View>
      )}

      {startDate && reminderEnabled && (
        <ReminderTimingField
          minutesBefore={reminderMinutesBefore}
          onChange={setReminderMinutesBefore}
          maxMinutes={maxReminderMinutes}
        />
      )}

      <Text style={styles.label}>Notes</Text>
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Optional notes"
            placeholderTextColor="#6C7A93"
            value={value}
            onChangeText={onChange}
            multiline
          />
        )}
      />

      <Pressable style={styles.button} onPress={handleSubmit(onSubmit)} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Creating…" : "Create Trip"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  label: { color: "#9AA5B8", fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: "#151C2C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232B3E",
    color: "#F5F7FA",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  error: { color: "#F87171", fontSize: 12, marginTop: 4 },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151C2C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232B3E",
    padding: 14,
    marginTop: 16
  },
  reminderTitle: { color: "#F5F7FA", fontSize: 14, fontWeight: "600" },
  reminderSub: { color: "#6C7A93", fontSize: 12, marginTop: 2 },
  button: {
    backgroundColor: "#4ADE80",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 28
  },
  buttonText: { color: "#0B1220", fontSize: 16, fontWeight: "700" }
});
