import { memo, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import PropTypes from "prop-types";
import { useStoreState } from "easy-peasy";
import { LocalTime } from "../utils/LocalTime";
import Day from "./Day";
import configData from "../config.json";
import { Temporal } from "@js-temporal/polyfill";
import {
  INFINITE_SCROLL,
  currentPageSize,
  reportChunkSettle,
} from "../utils/AdaptivePageSize";

// Mount the list in chunks, each inside a transition, so user input can
// pre-empt an in-flight chunk and the page is interactive after the first
// chunk instead of after all of them. Nothing is ever unmounted once
// revealed - this spreads the initial mount cost, it isn't virtualization.
// Chunk size adapts to the device (see AdaptivePageSize). With infinite
// scroll on, chunks additionally wait for the sentinel below the mount
// frontier to come within a viewport of the fold, so the DOM only grows as
// the user scrolls instead of always mounting the whole list.
const INITIAL_CHUNK_SIZE = 10;

const ProgramList = ({ program, now, forceExpanded = false }) => {
  const showLocalTime = useStoreState((state) => state.showLocalTime);
  useEffect(() => {
    LocalTime.storeCachedTimes();
  });

  // Reveal the list in chunks instead of mounting everything at once.
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(INITIAL_CHUNK_SIZE, program.length)
  );
  const [isPending, startTransition] = useTransition();

  // Memoized so each day's items array keeps a stable identity across
  // renders - that identity is what lets memo(Day) skip fully-revealed
  // days below.
  const days = useMemo(() => {
    const out = [];
    let cur = null;
    program.forEach((item) => {
      if (cur === null || item.dayKey !== cur.key) {
        cur = { key: item.dayKey, items: [] };
        out.push(cur);
      }
      cur.items.push(item);
    });
    return out;
  }, [program]);

  // Corrections when `program` changes shape, made during render (an
  // effect would show the uncorrected state for a frame):
  // - With infinite scroll, a changed result set starts back at the first
  //   chunk - keeping the old count would synchronously mount every page
  //   the user had scrolled through onto the new results. Time-based
  //   trimming produces a suffix of the old array (and identical results
  //   re-wrapped in a fresh array are their own suffix); those must not
  //   reset or the list would snap back mid-browse every clock tick.
  // - A list that had emptied out resumes at INITIAL_CHUNK_SIZE so results
  //   appear in this same commit, not after the first low-priority chunk.
  // - A shrunken list clamps visibleCount down - not for rendering (the
  //   day loop below caps naturally) but so that re-growing goes through
  //   the chunked transitions again instead of one giant synchronous
  //   commit.
  const [prevProgram, setPrevProgram] = useState(program);
  const programChanged = program !== prevProgram;
  if (programChanged) {
    setPrevProgram(program);
  }
  const isSuffixOfPrev =
    program.length > 0 &&
    program.length <= prevProgram.length &&
    program[program.length - 1] === prevProgram[prevProgram.length - 1] &&
    program[0] === prevProgram[prevProgram.length - program.length];
  let effectiveVisibleCount = visibleCount;
  if (
    (INFINITE_SCROLL && programChanged && !isSuffixOfPrev) ||
    (visibleCount === 0 && program.length > 0)
  ) {
    effectiveVisibleCount = Math.min(INITIAL_CHUNK_SIZE, program.length);
    setVisibleCount(effectiveVisibleCount);
  } else if (visibleCount > program.length) {
    effectiveVisibleCount = program.length;
    setVisibleCount(effectiveVisibleCount);
  }

  // A click or keypress makes React restart the in-flight transition, so
  // its elapsed time says nothing about device speed. Cleared when a chunk
  // is scheduled; a settle that finds it set discards its measurement.
  const interactedDuringChunkRef = useRef(false);
  useEffect(() => {
    function noteInteraction() {
      interactedDuringChunkRef.current = true;
    }
    window.addEventListener("pointerdown", noteInteraction, true);
    window.addEventListener("keydown", noteInteraction, true);
    return () => {
      window.removeEventListener("pointerdown", noteInteraction, true);
      window.removeEventListener("keydown", noteInteraction, true);
    };
  }, []);

  const inFlightChunkRef = useRef(null);

  // With infinite scroll, chunks only mount while the sentinel below the
  // frontier is within a viewport of the fold; each mounted chunk pushes
  // the sentinel down, so the list fills to one viewport ahead and stops.
  const [sentinelNear, setSentinelNear] = useState(false);
  const sentinelRef = useRef(null);
  const moreRemaining = effectiveVisibleCount < program.length;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!INFINITE_SCROLL || !node) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setSentinelNear(entry.isIntersecting),
      { rootMargin: "0px 0px 100% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [moreRemaining]);

  useEffect(() => {
    // The next chunk is queued when the previous one settles (isPending
    // flips false and this effect re-fires), so a slow chunk delays the
    // next rather than piling up.
    if (isPending) {
      return undefined;
    }
    const settled = inFlightChunkRef.current;
    if (settled !== null) {
      inFlightChunkRef.current = null;
      // Tail chunks are smaller than the size being measured, so they
      // can't be trusted either.
      if (settled.full && !interactedDuringChunkRef.current) {
        reportChunkSettle(settled.size, performance.now() - settled.start);
      }
    }
    if (visibleCount >= program.length) {
      return undefined;
    }
    if (INFINITE_SCROLL && !sentinelNear) {
      return undefined;
    }
    const pageSize = currentPageSize();
    const chunkSize = Math.min(pageSize, program.length - visibleCount);
    interactedDuringChunkRef.current = false;
    inFlightChunkRef.current = {
      start: performance.now(),
      size: chunkSize,
      full: chunkSize === pageSize,
    };
    startTransition(() => {
      setVisibleCount((count) => Math.min(count + chunkSize, program.length));
    });
    return undefined;
  }, [isPending, visibleCount, program, startTransition, sentinelNear]);
  useEffect(() => {
    // Printing needs the complete list immediately. A plain (non-transition)
    // update is higher priority, so it pre-empts the in-flight reveal.
    function revealAllForPrint() {
      setVisibleCount(program.length);
    }
    window.addEventListener("beforeprint", revealAllForPrint);
    return () => window.removeEventListener("beforeprint", revealAllForPrint);
  }, [program]);

  LocalTime.checkTimeZonesDiffer(program);

  if (program.length === 0) {
    return (
      <div className="program">
        <div className="program-empty">No items found.</div>
      </div>
    );
  }

  // Only the day at the reveal frontier gets a fresh slice; days before it
  // receive their memoized array unchanged, so memo(Day) skips them.
  const rows = [];
  let remaining = effectiveVisibleCount;
  for (const day of days) {
    if (remaining <= 0) break;
    const items =
      remaining >= day.items.length
        ? day.items
        : day.items.slice(0, remaining);
    remaining -= items.length;
    rows.push(
      <Day
        key={day.key}
        date={day.key}
        items={items}
        forceExpanded={forceExpanded}
        now={now}
      />
    );
  }
  const conventionTime = (
    <div className="time-convention-message" aria-hidden="true">
      {configData.CONVENTION_TIME.NOTICE.replace(
        "@timezone",
        configData.TIMEZONE
      )}
    </div>
  );
  const localTime =
    showLocalTime === "always" ||
    (showLocalTime === "differs" && LocalTime.timezonesDiffer) ? (
      <div className="time-local-message">
        {configData.LOCAL_TIME.NOTICE.replace(
          "@timezone",
          LocalTime.localTimeZone
        )}
      </div>
    ) : (
      ""
    );

  // Driven by the remaining count, not isPending - isPending blips false
  // at every chunk boundary, which would flicker the indicator.
  const loadingMore = moreRemaining ? (
    <div className="program-loading-more" role="status">
      <span className="program-loading-more-spinner" aria-hidden="true" />
      {configData.PROGRAM.LOADING_MORE_MESSAGE}
    </div>
  ) : null;
  const sentinel =
    INFINITE_SCROLL && moreRemaining ? (
      <div className="program-scroll-sentinel" ref={sentinelRef} />
    ) : null;

  return (
    <div className="program-container">
      {conventionTime}
      {localTime}
      <div className="program">{rows}</div>
      {sentinel}
      {loadingMore}
    </div>
  );
};

ProgramList.propTypes = {
  program: PropTypes.array.isRequired,
  now: PropTypes.instanceOf(Temporal.ZonedDateTime).isRequired,
  forceExpanded: PropTypes.bool,
};

// The parent re-renders on store changes that don't affect this list (item
// expansion, selections); memo keeps them from rebuilding the page's most
// expensive subtree.
export default memo(ProgramList);
