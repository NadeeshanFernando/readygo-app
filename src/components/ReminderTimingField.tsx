// src/components/ReminderTimingField.tsx
//
// Lets the user pick how long before a trip's start date the
// "Check Everything" reminder should fire. Offers quick presets plus a
// custom entry in minutes, hours, days, weeks, or months. Value is always
// stored/returned in minutes for precision (see Trip.reminderMinutesBefore).
//
// If `maxMinutes` is provided (the time remaining until the trip's start),
// any choice that would land in the past is rejected with a friendly
// message instead of being silently accepted.

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatReminderLeadTime } from "@/utils/reminderFormat";

interface Props {
  minutesBefore: number;
  onChange: (minutes: number) => void;
  /** Minutes remaining until the trip starts, if known. Used to block reminders that would fire in the past. */
  maxMinutes?: number | null;
}

type CustomUnit = "minutes" | "hours" | "days" | "weeks" | "months";

const UNIT_MINUTES: Record<CustomUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
  months: 43200 // approximated as 30 days
};

const UNIT_LABELS: Record<CustomUnit, string> = {
  minutes: "Minutes",
  hours: "Hours",
  days: "Days",
  weeks: "Weeks",
  months: "Months"
};

const PRESETS = [
  { label: "1 hour", minutes: 60 },
  { label: "3 hours", minutes: 180 },
  { label: "6 hours", minutes: 360 },
  { label: "12 hours", minutes: 720 },
  { label: "1 day", minutes: 1440 },
  { label: "2 days", minutes: 2880 },
  { label: "1 week", minutes: 10080 }
];

// Preferred order for reconstructing a "natural" unit from a raw minutes
// value — largest unit first, so e.g. 300 minutes displays as "5 Hours"
// instead of "300 Minutes", matching how someone would have typed it.
const UNIT_GUESS_ORDER: CustomUnit[] = ["months", "weeks", "days", "hours", "minutes"];

function guessUnitAndValue(minutes: number): { unit: CustomUnit; value: number } {
  for (const unit of UNIT_GUESS_ORDER) {
    const unitMinutes = UNIT_MINUTES[unit];
    if (minutes % unitMinutes === 0) {
      return { unit, value: minutes / unitMinutes };
    }
  }
  return { unit: "minutes", value: minutes };
}

export function ReminderTimingField({ minutesBefore, onChange, maxMinutes }: Props) {
  const matchingPreset = PRESETS.find((p) => p.minutes === minutesBefore);
  const initialGuess = matchingPreset ? null : guessUnitAndValue(minutesBefore);

  const [isCustom, setIsCustom] = useState(!matchingPreset);
  const [customUnit, setCustomUnit] = useState<CustomUnit>(initialGuess?.unit ?? "minutes");
  const [customText, setCustomText] = useState(matchingPreset ? "" : String(initialGuess?.value ?? minutesBefore));
  const [customError, setCustomError] = useState<string | null>(null);

  const hasLimit = typeof maxMinutes === "number";
  const tripStartedOrTooSoon = hasLimit && (maxMinutes as number) <= 0;

  const fitsWindow = (minutes: number) => !hasLimit || minutes <= (maxMinutes as number);

  const selectPreset = (minutes: number) => {
    if (!fitsWindow(minutes)) return; // disabled preset, ignore taps just in case
    setIsCustom(false);
    setCustomError(null);
    onChange(minutes);
  };

  const commitCustom = (text: string, unit: CustomUnit) => {
    const parsed = parseInt(text, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setCustomError(null);
      return;
    }
    const totalMinutes = parsed * UNIT_MINUTES[unit];

    if (!fitsWindow(totalMinutes)) {
      setCustomError(
        `That's more time than you have — this trip starts in ${formatReminderLeadTime(
          Math.max(maxMinutes as number, 0)
        )}. Pick a shorter reminder time.`
      );
      return;
    }

    setCustomError(null);
    onChange(totalMinutes);
  };

  const selectCustom = () => {
    setIsCustom(true);
    if (customText) commitCustom(customText, customUnit);
  };

  const handleCustomTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setCustomText(cleaned);
    if (cleaned) commitCustom(cleaned, customUnit);
    else setCustomError(null);
  };

  const handleUnitChange = (unit: CustomUnit) => {
    setCustomUnit(unit);
    if (customText) commitCustom(customText, unit);
  };

  if (tripStartedOrTooSoon) {
    return (
      <View style={styles.blockedBox}>
        <Text style={styles.blockedText}>
          This trip's start date/time has already passed, so a reminder can't be scheduled. Pick a
          future start date to enable one.
        </Text>
      </View>
    );
  }

  // If the currently selected value no longer fits (e.g. the user picked a
  // long lead time, then changed the start date to something sooner),
  // surface that clearly even before they touch anything else.
  const currentValueInvalid = !fitsWindow(minutesBefore);

  return (
    <View>
      <Text style={styles.label}>Remind me this far in advance</Text>

      {hasLimit && (
        <Text style={styles.availableHint}>
          This trip starts in {formatReminderLeadTime(maxMinutes as number)} — choose a reminder within
          that window.
        </Text>
      )}

      {currentValueInvalid && !isCustom && (
        <Text style={styles.errorText}>
          Your selected reminder no longer fits before this trip. Pick another option below.
        </Text>
      )}

      <View style={styles.chipRow}>
        {PRESETS.map((preset) => {
          const active = !isCustom && minutesBefore === preset.minutes;
          const disabled = !fitsWindow(preset.minutes);
          return (
            <Pressable
              key={preset.minutes}
              style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
              onPress={() => selectPreset(preset.minutes)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.chipText,
                  active && styles.chipTextActive,
                  disabled && styles.chipTextDisabled
                ]}
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable style={[styles.chip, isCustom && styles.chipActive]} onPress={selectCustom}>
          <Text style={[styles.chipText, isCustom && styles.chipTextActive]}>Custom</Text>
        </Pressable>
      </View>

      {isCustom && (
        <>
          <View style={styles.customRow}>
            <TextInput
              style={[styles.customInput, customError && styles.customInputError]}
              keyboardType="number-pad"
              placeholder="e.g. 90"
              placeholderTextColor="#6C7A93"
              value={customText}
              onChangeText={handleCustomTextChange}
            />
          </View>

          <View style={styles.unitToggle}>
            {(Object.keys(UNIT_LABELS) as CustomUnit[]).map((unit) => (
              <Pressable
                key={unit}
                style={[styles.unitOption, customUnit === unit && styles.unitOptionActive]}
                onPress={() => handleUnitChange(unit)}
              >
                <Text style={[styles.unitText, customUnit === unit && styles.unitTextActive]}>
                  {UNIT_LABELS[unit]}
                </Text>
              </Pressable>
            ))}
          </View>

          {customUnit === "months" && !customError && (
            <Text style={styles.customHint}>Months are approximated as 30 days.</Text>
          )}

          {customError ? (
            <Text style={styles.errorText}>{customError}</Text>
          ) : (
            <Text style={styles.customHint}>before your trip's start date</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: "#9AA5B8", fontSize: 13, marginBottom: 8, marginTop: 12 },
  availableHint: { color: "#6C7A93", fontSize: 12, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#232B3E",
    backgroundColor: "#151C2C"
  },
  chipActive: { backgroundColor: "#123B2A", borderColor: "#1F5D3E" },
  chipDisabled: { opacity: 0.35 },
  chipText: { color: "#9AA5B8", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#4ADE80" },
  chipTextDisabled: { color: "#6C7A93" },
  customRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  customInput: {
    backgroundColor: "#151C2C",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#232B3E",
    color: "#F5F7FA",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    width: 120
  },
  customInputError: { borderColor: "#F87171" },
  unitToggle: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#232B3E",
    backgroundColor: "#151C2C"
  },
  unitOptionActive: { backgroundColor: "#123B2A", borderColor: "#1F5D3E" },
  unitText: { color: "#9AA5B8", fontSize: 13, fontWeight: "600" },
  unitTextActive: { color: "#4ADE80" },
  customHint: { color: "#6C7A93", fontSize: 12, marginTop: 6 },
  errorText: { color: "#F87171", fontSize: 12, marginTop: 6 },
  blockedBox: {
    backgroundColor: "#3B1414",
    borderWidth: 1,
    borderColor: "#5D2323",
    borderRadius: 12,
    padding: 14,
    marginTop: 12
  },
  blockedText: { color: "#F87171", fontSize: 13, lineHeight: 18 }
});
