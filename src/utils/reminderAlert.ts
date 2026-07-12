// src/utils/reminderAlert.ts
import { Alert } from "react-native";
import { Trip } from "@/types";

/**
 * Shows a friendly confirmation/warning about what happened when the trip's
 * reminder was (re)scheduled, so scheduling issues are never silent. Safe to
 * call for trips with reminders disabled — it simply does nothing then.
 */
export function presentReminderOutcome(trip: Trip) {
  if (!trip.reminderEnabled) return;

  switch (trip.reminderStatus) {
    case "scheduled": {
      const when = trip.reminderScheduledFor
        ? new Date(trip.reminderScheduledFor).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          })
        : "the scheduled time";
      Alert.alert("Reminder set", `We'll notify you on ${when} to check everything for this trip.`);
      return;
    }
    case "permission_denied":
      Alert.alert(
        "Reminder not scheduled",
        "Notifications are turned off for ReadyGo, so we couldn't set your reminder. Enable notifications for this app in your device settings, then edit the trip to try again."
      );
      return;
    case "in_the_past":
      Alert.alert(
        "Reminder not scheduled",
        "The reminder time you chose has already passed. Pick a start date/time or lead time that leaves room for a future reminder."
      );
      return;
    case "error":
      Alert.alert(
        "Reminder not scheduled",
        "Something went wrong scheduling your reminder. You can try again by editing this trip."
      );
      return;
    default:
      return;
  }
}
