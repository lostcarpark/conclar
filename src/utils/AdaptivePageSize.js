import configData from "../config.json";

// Fall back when a deployed config.json predates these keys.
const limitConfig = configData.PROGRAM.LIMIT ?? {};

// When true, ProgramList loads more items as the user scrolls towards the
// bottom, and the classic limit drop-down / "Show more" button are ignored.
export const INFINITE_SCROLL = limitConfig.INFINITE_SCROLL ?? true;

const INITIAL_PAGE_SIZE = limitConfig.INITIAL_PAGE_SIZE ?? 50;

// How long a page is allowed to take from scheduling to settling. Sizes are
// steered towards this so slow devices get small commits and fast ones fewer.
const SETTLE_BUDGET_MS = 200;
const MIN_SIZE = 25;
const MAX_SIZE = 400;

// Module-level so the learned size survives remounts and route changes;
// deliberately not persisted across visits.
let currentSize = INITIAL_PAGE_SIZE;

export function currentPageSize() {
  return currentSize;
}

/**
 * Feed one clean (uninterrupted) chunk mount measurement. Callers must
 * discard polluted measurements - interrupted transitions, interaction
 * holds, partial tail chunks - rather than report them.
 * @param {number} size Number of items the measured chunk mounted.
 * @param {number} elapsedMs Time from scheduling the chunk to it settling.
 */
export function reportChunkSettle(size, elapsedMs) {
  if (size <= 0 || elapsedMs <= 0) {
    return;
  }
  // Ideal size is proportional to the budget; cap the per-step change so a
  // single noisy reading can't swing the size wildly.
  const factor = Math.min(2, Math.max(0.5, SETTLE_BUDGET_MS / elapsedMs));
  currentSize = Math.round(
    Math.min(MAX_SIZE, Math.max(MIN_SIZE, size * factor))
  );
}
