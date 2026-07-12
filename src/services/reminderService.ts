// src/services/reminderService.ts
//
// Schedules a local device notification reminding the user to run
// "Check Everything" before a trip. Uses expo-notifications. No backend
// or push credentials required — these are purely local, on-device
// scheduled notifications (works fully offline).

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Trip } from "@/types";
import { getTripStartDateTime } from "@/utils/reminderFormat";

// Show the notification banner even if the app is open in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

const ANDROID_CHANNEL_ID = "readygo-reminders";

/** Call once on app start (or before first schedule) to set up Android's notification channel. */
export async function initNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Trip reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250]
    });
  } catch (error) {
    console.warn("ReadyGo: failed to set up notification channel", error);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;

    const requested = await Notifications.requestPermissionsAsync();
    return !!requested.granted;
  } catch (error) {
    console.warn("ReadyGo: failed to check/request notification permission", error);
    return false;
  }
}

function buildDateTrigger(fireDate: Date): Notifications.NotificationTriggerInput {
  // Different expo-notifications versions expect slightly different trigger
  // shapes: newer ones require an explicit `type: SchedulableTriggerInputTypes.DATE`,
  // while older ones just take `{ date }`. Build the trigger defensively so
  // this works regardless of which shape got resolved by npm/expo install.
  const dateTriggerType = (Notifications as any).SchedulableTriggerInputTypes?.DATE;
  return (
    dateTriggerType
      ? {
          type: dateTriggerType,
          date: fireDate,
          channelId: Platform.OS === "android" ? ANDROID_CHANNEL_ID : undefined
        }
      : {
          date: fireDate,
          channelId: Platform.OS === "android" ? ANDROID_CHANNEL_ID : undefined
        }
  ) as Notifications.NotificationTriggerInput;
}

export type ReminderScheduleStatus =
  | "scheduled"
  | "no_start_date"
  | "in_the_past"
  | "permission_denied"
  | "error"
  | "disabled";

export interface ReminderScheduleResult {
  status: ReminderScheduleStatus;
  notificationId?: string;
  scheduledFor?: string; // ISO datetime, only set when status === "scheduled"
}

/**
 * Schedules a "Check Everything" reminder for a trip, `minutesBefore` minutes
 * ahead of its actual start (startDate + startTime). Always returns a
 * result describing what happened — including *why* it didn't schedule —
 * instead of silently doing nothing.
 */
export async function scheduleTripReminder(trip: Trip, minutesBefore: number): Promise<ReminderScheduleResult> {
  const startDateTime = getTripStartDateTime(trip.startDate, trip.startTime);
  if (!startDateTime) return { status: "no_start_date" };

  const fireDate = new Date(startDateTime.getTime() - minutesBefore * 60 * 1000);
  if (fireDate.getTime() <= Date.now()) {
    return { status: "in_the_past" };
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    console.warn("ReadyGo: notification permission was not granted — reminder not scheduled.");
    return { status: "permission_denied" };
  }

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Ready to pack? 🧳",
        body: `Run "Check Everything" for ${trip.title} before you head out.`,
        data: { tripId: trip.id }
      },
      trigger: buildDateTrigger(fireDate)
    });

    console.log(
      `ReadyGo: scheduled reminder "${notificationId}" for trip "${trip.title}" to fire at ${fireDate.toISOString()}`
    );

    return { status: "scheduled", notificationId, scheduledFor: fireDate.toISOString() };
  } catch (error) {
    // Never let a notification-scheduling issue block creating/editing a trip —
    // log it and simply proceed without a reminder.
    console.warn("ReadyGo: failed to schedule trip reminder", error);
    return { status: "error" };
  }
}

export async function cancelTripReminder(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Notification may have already fired or been cancelled; safe to ignore.
  }
}

/**
 * Convenience helper: cancels any existing reminder for a trip, then
 * schedules a new one if reminders are enabled and a startDate is set.
 * Always returns a result so the caller can persist/display what happened.
 */
export async function rescheduleTripReminder(trip: Trip): Promise<ReminderScheduleResult> {
  await cancelTripReminder(trip.reminderNotificationId);

  if (!trip.reminderEnabled || !trip.startDate) {
    return { status: "disabled" };
  }

  const minutesBefore = trip.reminderMinutesBefore ?? 1440; // default: 1 day (1440 minutes)
  return scheduleTripReminder(trip, minutesBefore);
}

/**
 * Fires a one-off test notification a few seconds from now, independent of
 * any trip. Useful for confirming notifications actually work on this
 * device/build before troubleshooting trip-specific reminder logic — e.g.
 * local scheduled notifications can behave differently between Expo Go and
 * a custom development build, especially on Android.
 */
export async function sendTestNotification(secondsFromNow = 10): Promise<ReminderScheduleResult> {
  const granted = await requestNotificationPermission();
  if (!granted) return { status: "permission_denied" };

  const fireDate = new Date(Date.now() + secondsFromNow * 1000);

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "ReadyGo test notification 🔔",
        body: "If you see this, local notifications are working on this device."
      },
      trigger: buildDateTrigger(fireDate)
    });
    return { status: "scheduled", notificationId, scheduledFor: fireDate.toISOString() };
  } catch (error) {
    console.warn("ReadyGo: failed to schedule test notification", error);
    return { status: "error" };
  }
}
