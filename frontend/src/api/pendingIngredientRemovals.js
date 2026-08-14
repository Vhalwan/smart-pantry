import { deleteIngredient } from "./ingredients";

const STORAGE_KEY = "smart-pantry:pending-ingredient-removals";
const DEFAULT_DELAY_MS = 5000;

/**
 * Per-ingredient delayed DELETEs. Fully independent of React and of the
 * visible undo toast. Keyed by ingredient id; cancelling/settling one id
 * never touches another.
 *
 * Deadlines are persisted to sessionStorage so a navigate-away + refresh
 * still flushes overdue deletes.
 */
const pendingRemovals = new Map();
const listeners = new Set();

function toId(id) {
  return Number(id);
}

function emit(event) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Listener errors must not break other ids' flows.
    }
  }
}

/** Subscribe to store events: scheduled | cancelled | deleted | delete-failed. */
export function subscribePendingRemovals(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage() {
  try {
    const serializable = [...pendingRemovals.values()].map((entry) => ({
      id: entry.id,
      item: entry.item,
      index: entry.index,
      deadline: entry.deadline,
    }));
    if (serializable.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    }
  } catch {
    // In-memory timers still run if storage is unavailable.
  }
}

function clearTimer(entry) {
  if (entry?.timeoutId != null) {
    clearTimeout(entry.timeoutId);
    entry.timeoutId = null;
  }
}

export function cancelPendingRemoval(id) {
  const key = toId(id);
  const entry = pendingRemovals.get(key);
  if (!entry) {
    return null;
  }
  // DELETE already in flight — Undo no longer applies for this id.
  if (entry.flushing) {
    return null;
  }
  clearTimer(entry);
  pendingRemovals.delete(key);
  writeStorage();
  const snapshot = { item: entry.item, index: entry.index, id: key };
  emit({ type: "cancelled", ...snapshot });
  return snapshot;
}

export function hasPendingRemoval(id) {
  return pendingRemovals.has(toId(id));
}

export function getPendingRemovalIds() {
  return new Set(pendingRemovals.keys());
}

export function getPendingRemoval(id) {
  const entry = pendingRemovals.get(toId(id));
  if (!entry) {
    return null;
  }
  return { id: entry.id, item: entry.item, index: entry.index, deadline: entry.deadline };
}

async function executeDelete(id) {
  try {
    await deleteIngredient(id);
    return { ok: true };
  } catch (err) {
    if (err?.response?.status === 404) {
      return { ok: true };
    }
    const status = err?.response?.status;
    const permanent = status === 409 || status === 400;
    return { ok: false, permanent, error: err };
  }
}

async function flushRemoval(id) {
  const key = toId(id);
  const entry = pendingRemovals.get(key);
  if (!entry || entry.flushing) {
    return;
  }

  // Stop the timer but keep the entry until DELETE succeeds so a refresh
  // during the request can still retry. Undo may still cancel this entry.
  clearTimer(entry);
  entry.flushing = true;

  const result = await executeDelete(key);

  // Undo won while the request was in flight — drop our result.
  // (Toast is usually already gone by the time DELETE starts, so this race
  // is rare; if DELETE succeeded anyway the next load will reflect backend.)
  const current = pendingRemovals.get(key);
  if (!current || current !== entry) {
    return;
  }

  if (!result.ok) {
    if (result.permanent) {
      pendingRemovals.delete(key);
      writeStorage();
      const detail = result.error?.response?.data?.detail;
      emit({
        type: "delete-failed",
        id: key,
        item: entry.item,
        index: entry.index,
        message:
          typeof detail === "string" ? detail : "Failed to delete ingredient.",
      });
      return;
    }
    entry.flushing = false;
    // Silent retry — do not emit UI errors that could look like they belong
    // to a different ingredient's toast/undo.
    entry.deadline = Date.now() + DEFAULT_DELAY_MS;
    writeStorage();
    armTimer(key, DEFAULT_DELAY_MS);
    return;
  }

  pendingRemovals.delete(key);
  writeStorage();
  emit({
    type: "deleted",
    id: key,
    item: entry.item,
    index: entry.index,
  });
}

function armTimer(id, delayMs) {
  const entry = pendingRemovals.get(toId(id));
  if (!entry || entry.flushing) {
    return;
  }
  clearTimer(entry);
  entry.timeoutId = setTimeout(() => {
    void flushRemoval(entry.id);
  }, Math.max(0, delayMs));
}

/**
 * Schedule a delayed DELETE for one ingredient.
 * Replaces any existing schedule for this id only.
 */
export function schedulePendingRemoval(
  item,
  { index = 0, delayMs = DEFAULT_DELAY_MS } = {},
) {
  const id = toId(item.id);
  cancelPendingRemoval(id);

  const deadline = Date.now() + delayMs;
  pendingRemovals.set(id, {
    id,
    timeoutId: null,
    item: { ...item, id },
    index,
    deadline,
    flushing: false,
  });
  writeStorage();
  armTimer(id, delayMs);
  emit({ type: "scheduled", id, item: { ...item, id }, index });
}

/** Flush any deadlines that already passed (tab throttle / missed timer). */
export function flushOverduePendingRemovals() {
  const now = Date.now();
  for (const entry of [...pendingRemovals.values()]) {
    if (!entry.flushing && entry.deadline <= now) {
      void flushRemoval(entry.id);
    }
  }
}

function hydrateFromStorage() {
  const saved = readStorage();
  const now = Date.now();

  for (const row of saved) {
    if (row?.id == null || !row.item) {
      continue;
    }
    const id = toId(row.id);
    if (pendingRemovals.has(id)) {
      continue;
    }

    const deadline = Number(row.deadline) || now;
    pendingRemovals.set(id, {
      id,
      timeoutId: null,
      item: { ...row.item, id },
      index: Number.isFinite(row.index) ? row.index : 0,
      deadline,
      flushing: false,
    });

    const remaining = deadline - now;
    if (remaining <= 0) {
      void flushRemoval(id);
    } else {
      armTimer(id, remaining);
    }
  }
}

export function rehydratePendingRemovals() {
  hydrateFromStorage();
  flushOverduePendingRemovals();
}

hydrateFromStorage();

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      flushOverduePendingRemovals();
    }
  });
}
if (typeof window !== "undefined") {
  window.addEventListener("focus", () => {
    flushOverduePendingRemovals();
  });
}
