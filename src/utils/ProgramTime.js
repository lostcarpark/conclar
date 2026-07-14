import PropTypes from "prop-types";
import configData from "../config.json" with { type: "json" };

/**
 * The programme's entire view of the clock.
 *
 * Time-dependent behavior lives here, in three co-located parts:
 *  - boundariesOf(item) derives every epoch a decision compares the
 *    clock against from the item's schedule facts;
 *  - the query methods on programTimeAt's reading are the only decisions
 *    components can make, each comparing against a boundariesOf field;
 *  - collectBoundaries gathers every value boundariesOf produces, and
 *    useProgramTime only publishes a new reading when a tick crosses one
 *    (crossedBoundary) or the programme itself is replaced.
 * Components never see a raw date: they can only ask these questions, so
 * every possible use of a reading is one the tick gating knows about. To
 * add a new time-based decision, add its threshold in boundariesOf (it
 * becomes a tick boundary automatically) and add a query method that
 * compares against it.
 */

const boundariesCache = new WeakMap();

/**
 * Every epoch a time-based decision compares the clock against, derived
 * from the item's schedule facts. Only ever compared, never formatted or
 * displayed. Cached per item: items are immutable once processed, and
 * the queries run per item per render.
 *
 * @param {object} item Processed programme item (see ProgramData).
 * @returns {object} Epoch milliseconds, keyed by threshold name.
 */
function boundariesOf(item) {
  let boundaries = boundariesCache.get(item);
  if (boundaries !== undefined) {
    return boundaries;
  }
  const startEpochMs = item.startDateAndTime.epochMilliseconds;
  const endEpochMs = item.endDateAndTime.epochMilliseconds;
  // The epoch after which "hide past items" hides this item, including
  // the config margin and branch.
  const pastAdjustMs = configData.SHOW_PAST_ITEMS.ADJUST_MINUTES * 60000;
  let pastCutoffEpochMs;
  if (configData.SHOW_PAST_ITEMS.FROM_START) {
    pastCutoffEpochMs = startEpochMs - pastAdjustMs;
  } else {
    const nearEndEpochMs =
      startEpochMs +
      (item.hasOwnProperty("mins")
        ? item.mins
        : configData.SHOW_PAST_ITEMS.ADJUST_MINUTES) *
        60000;
    pastCutoffEpochMs = nearEndEpochMs + pastAdjustMs;
  }
  boundaries = {
    // phaseOf (link WHEN gating): the "during" phase opens 20min early
    // and closes 10min late.
    bufferedStartEpochMs: startEpochMs - 20 * 60000,
    bufferedEndEpochMs: endEpochMs + 10 * 60000,
    // isPast / hidePastItems.
    pastCutoffEpochMs,
    // isDuringCon (first item's start, last item's end).
    startEpochMs,
    endEpochMs,
  };
  boundariesCache.set(item, boundaries);
  return boundaries;
}

/**
 * A reading of the programme clock: the time-based answers for `program`
 * as of `epochMs`, frozen. useProgramTime holds one reading until its
 * answers go stale (a boundary crossing or a new programme), so a
 * reading's identity doubles as the memo invalidation key all the way
 * down the programme tree.
 *
 * @param {number} epochMs
 * @param {array} program Processed programme (defines the con's span).
 */
export function programTimeAt(epochMs, program) {
  const conStartEpochMs =
    program.length > 0 ? boundariesOf(program[0]).startEpochMs : null;
  // The programme is sorted by start time, so a long item that starts
  // before the last one but ends after it would be missed here.
  const conEndEpochMs =
    program.length > 0
      ? boundariesOf(program[program.length - 1]).endEpochMs
      : null;
  return Object.freeze({
    /**
     * The phase of the item's lifecycle: "before", "during" (from 20min
     * before start to 10min after end) or "after". Matches the link
     * WHEN config vocabulary.
     */
    phaseOf(item) {
      const boundaries = boundariesOf(item);
      if (epochMs < boundaries.bufferedStartEpochMs) {
        return "before";
      }
      if (epochMs < boundaries.bufferedEndEpochMs) {
        return "during";
      }
      return "after";
    },
    /** True once the item passes its "hide past items" cutoff. */
    isPast(item) {
      return epochMs > boundariesOf(item).pastCutoffEpochMs;
    },
    /** True between the first item's start and the last item's end. */
    isDuringCon() {
      return (
        conStartEpochMs !== null &&
        epochMs > conStartEpochMs &&
        epochMs < conEndEpochMs
      );
    },
    /**
     * The "hide past items" policy: during the convention, with the
     * setting off, items past their cutoff are hidden; at any other time
     * (or with "show past items" on) the list is untouched.
     *
     * @param {Array} items The list to trim (may be a filtered subset).
     * @param {bool} showPastItems The user's setting.
     */
    hidePastItems(items, showPastItems) {
      if (showPastItems || !this.isDuringCon()) {
        return items;
      }
      return items.filter((item) => !this.isPast(item));
    },
  });
}

export const programTimePropType = PropTypes.shape({
  phaseOf: PropTypes.func.isRequired,
  isPast: PropTypes.func.isRequired,
  isDuringCon: PropTypes.func.isRequired,
  hidePastItems: PropTypes.func.isRequired,
});

/**
 * Every epoch at which some query above changes its answer. Between two
 * consecutive boundaries, every comparison against the clock gives the
 * same result, so publishing a new reading would re-render the whole
 * programme tree to produce identical output.
 *
 * Collects every value boundariesOf derives, so a threshold added there
 * is picked up automatically.
 *
 * @param {array} program Processed programme.
 * @returns {array} Sorted epoch milliseconds.
 */
export function collectBoundaries(program) {
  const collected = [];
  for (const item of program) {
    const boundaries = boundariesOf(item);
    for (const key in boundaries) {
      collected.push(boundaries[key]);
    }
  }
  return collected.sort((a, b) => a - b);
}

/**
 * Whether a boundary lies between the two instants - i.e. whether a
 * reading taken at prevEpochMs would answer anything differently at
 * nextEpochMs, so a new reading needs to be published.
 *
 * @param {array} sorted Boundaries from collectBoundaries.
 * @param {number} prevEpochMs
 * @param {number} nextEpochMs
 * @returns {bool}
 */
export function crossedBoundary(sorted, prevEpochMs, nextEpochMs) {
  return countPassed(sorted, prevEpochMs) !== countPassed(sorted, nextEpochMs);
}

/** Number of boundaries at or before `epochMs` (binary search). */
function countPassed(sorted, epochMs) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= epochMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
