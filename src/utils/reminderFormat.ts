// src/utils/reminderFormat.ts

/** Formats a minutes value into a short human-readable string, e.g. "90 min", "6h", "1 day". */
export function formatReminderLeadTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours}h`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}min`;
}

const DEFAULT_START_TIME = "09:00";

/**
 * Builds the actual anchor Date for a trip's start, combining startDate with
 * an optional startTime ("HH:mm"). Falls back to 09:00 if no time was set,
 * so trips without a specific departure time still get sensible reminders.
 */
export function getTripStartDateTime(startDate?: string, startTime?: string): Date | null {
  if (!startDate) return null;
  return new Date(`${startDate}T${startTime ?? DEFAULT_START_TIME}:00`);
}

/**
 * Minutes remaining between now and a trip's actual start (startDate +
 * startTime, defaulting to 09:00 if no time was set). Returns null if
 * there's no start date. Can be zero or negative if the start date/time
 * has already passed.
 */
export function minutesUntilTripStart(startDate?: string, startTime?: string): number | null {
  const startDateTime = getTripStartDateTime(startDate, startTime);
  if (!startDateTime) return null;
  const diffMs = startDateTime.getTime() - Date.now();
  return Math.floor(diffMs / 60000);
}

