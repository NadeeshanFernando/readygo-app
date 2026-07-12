// src/components/DateField.tsx
//
// A tappable field that opens the native calendar/date picker
// (@react-native-community/datetimepicker) and displays the chosen date.
// Stores/returns dates as "YYYY-MM-DD" strings to match the Trip model.

import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

interface Props {
  label: string;
  value?: string; // "YYYY-MM-DD"
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  minimumDate?: Date;
}

function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplay(value?: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function DateField({ label, value, onChange, placeholder = "Select a date", minimumDate }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const currentDate = value ? new Date(`${value}T00:00:00`) : new Date();

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Android fires "dismissed" if the user cancels; iOS fires continuously
    // while scrolling the spinner, so only commit on an actual selection.
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selectedDate) {
        onChange(toIsoDateString(selectedDate));
      }
      return;
    }
    if (selectedDate) {
      onChange(toIsoDateString(selectedDate));
    }
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {formatDisplay(value) ?? placeholder}
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
          <Text style={styles.calendarIcon}>📅</Text>
        )}
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={handleChange}
          minimumDate={minimumDate}
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
  calendarIcon: { fontSize: 16 },
  clear: { color: "#F87171", fontSize: 13, fontWeight: "600" },
  doneButton: { alignItems: "flex-end", paddingVertical: 8 },
  doneButtonText: { color: "#4ADE80", fontWeight: "700", fontSize: 15 }
});
