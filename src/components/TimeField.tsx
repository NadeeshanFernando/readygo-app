// src/components/TimeField.tsx
//
// A tappable field that opens the native time picker
// (@react-native-community/datetimepicker, mode="time") and displays the
// chosen time. Stores/returns time as "HH:mm" (24h) strings. Optional by
// design — leaving it unset lets callers fall back to a sensible default
// (e.g. reminderService/reminderFormat default to "09:00").

import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

interface Props {
  label: string;
  value?: string; // "HH:mm"
  onChange: (value: string | undefined) => void;
  defaultDisplayLabel?: string; // shown when no value is set, e.g. "9:00 AM (default)"
}

function toHHmm(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDisplay(value?: string): string | null {
  if (!value) return null;
  const [hoursStr, minutesStr] = value.split(":");
  const date = new Date();
  date.setHours(parseInt(hoursStr, 10), parseInt(minutesStr, 10), 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function TimeField({ label, value, onChange, defaultDisplayLabel = "9:00 AM (default)" }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const currentTime = (() => {
    const date = new Date();
    if (value) {
      const [hoursStr, minutesStr] = value.split(":");
      date.setHours(parseInt(hoursStr, 10), parseInt(minutesStr, 10), 0, 0);
    } else {
      date.setHours(9, 0, 0, 0);
    }
    return date;
  })();

  const handleValueChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selectedTime) {
      onChange(toHHmm(selectedTime));
    }
  };

  const handleDismiss = () => {
    setShowPicker(false);
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {formatDisplay(value) ?? defaultDisplayLabel}
        </Text>
        {value ? (
          <Pressable
            hitSlop={10}
            onPress={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
          >
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : (
          <Text style={styles.clockIcon}>🕐</Text>
        )}
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={currentTime}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onValueChange={handleValueChange}
          onDismiss={handleDismiss}
          themeVariant="dark"
        />
      )}

      {Platform.OS === "ios" && showPicker && (
        <Pressable style={styles.doneButton} onPress={() => setShowPicker(false)}>
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: "#9AA5B8", fontSize: 13, marginBottom: 6, marginTop: 14 },
  field: {
    backgroundColor: "#151C2C",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#232B3E",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  valueText: { color: "#F5F7FA", fontSize: 15 },
  placeholderText: { color: "#6C7A93", fontSize: 15 },
  clockIcon: { fontSize: 16 },
  clear: { color: "#F87171", fontSize: 13, fontWeight: "600" },
  doneButton: { alignItems: "flex-end", paddingVertical: 8 },
  doneButtonText: { color: "#4ADE80", fontWeight: "700", fontSize: 15 }
});
