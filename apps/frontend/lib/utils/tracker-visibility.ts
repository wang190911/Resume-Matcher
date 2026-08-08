import { safeStorage } from './resume-draft-storage';
import { APPLICATION_STATUS_ORDER, type ApplicationStatus } from '@/lib/api/tracker';

/**
 * localStorage key for the tracker column visibility preference.
 *
 * Stores a JSON array of hidden status keys (not visible ones) so that any
 * status added to `APPLICATION_STATUS_ORDER` in the future defaults to visible
 * without a migration.
 */
export const TRACKER_HIDDEN_STATUSES_KEY = 'resume_matcher_tracker_hidden_statuses';

const VALID_STATUSES = new Set<string>(APPLICATION_STATUS_ORDER);

/**
 * Read and validate the hidden-statuses preference from localStorage.
 *
 * Returns an empty array (all visible) when storage is unavailable, the key
 * is missing, or the stored value is malformed. Unknown or duplicate statuses
 * are filtered out; if every status would be hidden, the result falls back to
 * empty (all visible) so the board is never left empty.
 */
export function loadHiddenStatuses(): Set<ApplicationStatus> {
  const raw = safeStorage.get(TRACKER_HIDDEN_STATUSES_KEY);
  if (!raw) return new Set();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Set();
  }

  if (!Array.isArray(parsed)) return new Set();

  const seen = new Set<string>();
  const hidden: ApplicationStatus[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string') continue;
    if (!VALID_STATUSES.has(item)) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    hidden.push(item as ApplicationStatus);
  }

  // Never allow hiding every column 鈥?fall back to all-visible.
  if (hidden.length >= APPLICATION_STATUS_ORDER.length) return new Set();

  return new Set(hidden);
}

/** Persist the hidden-statuses set to localStorage (best-effort). */
export function saveHiddenStatuses(hidden: Set<ApplicationStatus>): void {
  safeStorage.set(TRACKER_HIDDEN_STATUSES_KEY, JSON.stringify([...hidden]));
}

/**
 * Toggle a status in the hidden set, enforcing the minimum-one-visible rule.
 *
 * Returns the new set. If hiding `status` would empty the visible list, the
 * set is returned unchanged (the caller should disable the toggle in that
 * case, but this is the safety net).
 */
export function toggleStatusHidden(
  hidden: Set<ApplicationStatus>,
  status: ApplicationStatus
): Set<ApplicationStatus> {
  const next = new Set(hidden);
  if (next.has(status)) {
    next.delete(status);
    return next;
  }
  // Would this hide the last visible column?
  if (next.size + 1 >= APPLICATION_STATUS_ORDER.length) return next;
  next.add(status);
  return next;
}

/** Ordered list of statuses that are currently visible. */
export function visibleStatuses(hidden: Set<ApplicationStatus>): ApplicationStatus[] {
  return APPLICATION_STATUS_ORDER.filter((s) => !hidden.has(s));
}
