import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  loadHiddenStatuses,
  saveHiddenStatuses,
  toggleStatusHidden,
  visibleStatuses,
  TRACKER_HIDDEN_STATUSES_KEY,
} from '@/lib/utils/tracker-visibility';
import { APPLICATION_STATUS_ORDER, type ApplicationStatus } from '@/lib/api/tracker';

// Mock i18n so the dialog renders translated labels as the key path.
vi.mock('@/lib/i18n', () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

// --- pure-logic tests ----------------------------------------------------

describe('loadHiddenStatuses', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty set when nothing is stored', () => {
    expect(loadHiddenStatuses().size).toBe(0);
  });

  it('parses a valid hidden-statuses array', () => {
    localStorage.setItem(TRACKER_HIDDEN_STATUSES_KEY, JSON.stringify(['saved', 'rejected']));
    const hidden = loadHiddenStatuses();
    expect(hidden.has('saved')).toBe(true);
    expect(hidden.has('rejected')).toBe(true);
    expect(hidden.size).toBe(2);
  });

  it('filters out unknown statuses', () => {
    localStorage.setItem(
      TRACKER_HIDDEN_STATUSES_KEY,
      JSON.stringify(['saved', 'unknown_status', 'rejected'])
    );
    const hidden = loadHiddenStatuses();
    expect(hidden.size).toBe(2);
    expect(hidden.has('saved')).toBe(true);
    expect(hidden.has('rejected')).toBe(true);
  });

  it('deduplicates repeated statuses', () => {
    localStorage.setItem(
      TRACKER_HIDDEN_STATUSES_KEY,
      JSON.stringify(['saved', 'saved', 'rejected'])
    );
    expect(loadHiddenStatuses().size).toBe(2);
  });

  it('falls back to all-visible when all statuses are hidden', () => {
    localStorage.setItem(TRACKER_HIDDEN_STATUSES_KEY, JSON.stringify(APPLICATION_STATUS_ORDER));
    expect(loadHiddenStatuses().size).toBe(0);
  });

  it('returns empty set for malformed JSON', () => {
    localStorage.setItem(TRACKER_HIDDEN_STATUSES_KEY, '{not json');
    expect(loadHiddenStatuses().size).toBe(0);
  });

  it('returns empty set for non-array JSON', () => {
    localStorage.setItem(TRACKER_HIDDEN_STATUSES_KEY, '{"a":1}');
    expect(loadHiddenStatuses().size).toBe(0);
  });
});

describe('saveHiddenStatuses', () => {
  beforeEach(() => localStorage.clear());

  it('persists the hidden set as a JSON array', () => {
    const hidden = new Set<ApplicationStatus>(['saved', 'rejected']);
    saveHiddenStatuses(hidden);
    const raw = localStorage.getItem(TRACKER_HIDDEN_STATUSES_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(['saved', 'rejected']);
  });

  it('round-trips through loadHiddenStatuses', () => {
    const hidden = new Set<ApplicationStatus>(['interview', 'accepted']);
    saveHiddenStatuses(hidden);
    expect(loadHiddenStatuses()).toEqual(hidden);
  });
});

describe('toggleStatusHidden', () => {
  it('adds a status to the hidden set', () => {
    const result = toggleStatusHidden(new Set(), 'saved');
    expect(result.has('saved')).toBe(true);
  });

  it('removes a status from the hidden set', () => {
    const result = toggleStatusHidden(new Set<ApplicationStatus>(['saved']), 'saved');
    expect(result.has('saved')).toBe(false);
  });

  it('does not mutate the original set', () => {
    const original = new Set<ApplicationStatus>(['saved']);
    toggleStatusHidden(original, 'rejected');
    expect(original.has('rejected')).toBe(false);
  });

  it('prevents hiding the last visible column', () => {
    // All but one are hidden 鈥?hiding the last one should be a no-op.
    const allButOne = APPLICATION_STATUS_ORDER.slice(0, -1) as ApplicationStatus[];
    const hidden = new Set<ApplicationStatus>(allButOne);
    const result = toggleStatusHidden(
      hidden,
      APPLICATION_STATUS_ORDER[APPLICATION_STATUS_ORDER.length - 1]
    );
    expect(result.has(APPLICATION_STATUS_ORDER[APPLICATION_STATUS_ORDER.length - 1])).toBe(false);
  });
});

describe('visibleStatuses', () => {
  it('returns all statuses when nothing is hidden', () => {
    expect(visibleStatuses(new Set())).toEqual(APPLICATION_STATUS_ORDER);
  });

  it('excludes hidden statuses', () => {
    const hidden = new Set<ApplicationStatus>(['saved', 'rejected']);
    const visible = visibleStatuses(hidden);
    expect(visible).toEqual(APPLICATION_STATUS_ORDER.filter((s) => !hidden.has(s)));
  });

  it('preserves the canonical order', () => {
    const hidden = new Set<ApplicationStatus>(['applied', 'interview']);
    const visible = visibleStatuses(hidden);
    const expectedOrder = APPLICATION_STATUS_ORDER.filter((s) => !hidden.has(s));
    expect(visible).toEqual(expectedOrder);
  });
});

// --- component tests -----------------------------------------------------

describe('ManageStatusColumnsDialog', () => {
  beforeEach(() => localStorage.clear());

  it('renders a toggle for every status', async () => {
    const { ManageStatusColumnsDialog } =
      await import('@/components/tracker/manage-status-columns-dialog');
    render(
      <ManageStatusColumnsDialog
        open
        onOpenChange={vi.fn()}
        hidden={new Set()}
        onHiddenChange={vi.fn()}
      />
    );
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(APPLICATION_STATUS_ORDER.length);
  });

  it('reflects the hidden state on toggles', async () => {
    const { ManageStatusColumnsDialog } =
      await import('@/components/tracker/manage-status-columns-dialog');
    render(
      <ManageStatusColumnsDialog
        open
        onOpenChange={vi.fn()}
        hidden={new Set<ApplicationStatus>(['saved', 'rejected'])}
        onHiddenChange={vi.fn()}
      />
    );
    const switches = screen.getAllByRole('switch');
    const savedSwitch = switches.find(
      (s) => s.getAttribute('aria-label') === 'tracker.columns.saved'
    );
    const appliedSwitch = switches.find(
      (s) => s.getAttribute('aria-label') === 'tracker.columns.applied'
    );
    expect(savedSwitch).toHaveAttribute('aria-checked', 'false');
    expect(appliedSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onHiddenChange when a toggle is clicked', async () => {
    const { ManageStatusColumnsDialog } =
      await import('@/components/tracker/manage-status-columns-dialog');
    const onHiddenChange = vi.fn();
    render(
      <ManageStatusColumnsDialog
        open
        onOpenChange={vi.fn()}
        hidden={new Set()}
        onHiddenChange={onHiddenChange}
      />
    );
    const switches = screen.getAllByRole('switch');
    const savedSwitch = switches.find(
      (s) => s.getAttribute('aria-label') === 'tracker.columns.saved'
    );
    fireEvent.click(savedSwitch!);
    expect(onHiddenChange).toHaveBeenCalledTimes(1);
    const newSet = onHiddenChange.mock.calls[0][0] as Set<ApplicationStatus>;
    expect(newSet.has('saved')).toBe(true);
  });

  it('disables the last visible toggle', async () => {
    const { ManageStatusColumnsDialog } =
      await import('@/components/tracker/manage-status-columns-dialog');
    const allButOne = APPLICATION_STATUS_ORDER.slice(0, -1) as ApplicationStatus[];
    const hidden = new Set<ApplicationStatus>(allButOne);
    render(
      <ManageStatusColumnsDialog
        open
        onOpenChange={vi.fn()}
        hidden={hidden}
        onHiddenChange={vi.fn()}
      />
    );
    const lastStatus = APPLICATION_STATUS_ORDER[APPLICATION_STATUS_ORDER.length - 1];
    const lastSwitch = screen
      .getAllByRole('switch')
      .find((s) => s.getAttribute('aria-label') === `tracker.columns.${lastStatus}`);
    expect(lastSwitch).toBeDisabled();
  });
});
