/** Same window as pantry badges and suggestion prompt tagging. */
export const NEAR_EXPIRY_DAYS = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse YYYY-MM-DD (or ISO datetime prefix) as a local calendar date. */
export function parseLocalDate(value) {
  if (value == null || value === "") {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, month, day);
}

/** Calendar-day difference in local time (DST-safe via UTC day numbers). */
export function calendarDaysBetween(fromDate, toDate) {
  const fromUtc = Date.UTC(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate(),
  );
  const toUtc = Date.UTC(
    toDate.getFullYear(),
    toDate.getMonth(),
    toDate.getDate(),
  );
  return Math.round((toUtc - fromUtc) / MS_PER_DAY);
}

/**
 * Returns "expired" | "expiring_soon" | null.
 * Compares calendar dates only so time-of-day never flips the status.
 */
export function getExpiryStatus(expiryDate) {
  const expiry = parseLocalDate(expiryDate);
  if (!expiry) {
    return null;
  }
  const today = new Date();
  const daysUntil = calendarDaysBetween(today, expiry);
  if (daysUntil < 0) {
    return "expired";
  }
  if (daysUntil <= NEAR_EXPIRY_DAYS) {
    return "expiring_soon";
  }
  return null;
}

/**
 * Linked pantry ingredients that are expired or expiring soon (unique by id).
 */
export function assessLinkedExpiry(recipe, pantryById) {
  const expired = [];
  const expiringSoon = [];
  const seen = new Set();

  for (const line of recipe?.ingredients ?? []) {
    const item = pantryById.get(line.ingredient_id);
    if (!item || seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    const status = getExpiryStatus(item.expiry_date);
    if (status === "expired") {
      expired.push(item.name);
    } else if (status === "expiring_soon") {
      expiringSoon.push(item.name);
    }
  }

  return {
    expired,
    expiringSoon,
    hasFlags: expired.length > 0 || expiringSoon.length > 0,
  };
}
