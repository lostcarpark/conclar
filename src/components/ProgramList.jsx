import { memo, useEffect, useMemo, useState, useTransition } from 'react';
import PropTypes from "prop-types";
import { useStoreState } from "easy-peasy";
import { LocalTime } from "../utils/LocalTime";
import Day from "./Day";
import configData from "../config.json";
import { Temporal } from "@js-temporal/polyfill";

// Mount the list in chunks, each inside a transition, so user input can
// pre-empt an in-flight chunk and the page is interactive after the first
// chunk instead of after all of them. Nothing is ever unmounted once
// revealed - this spreads the initial mount cost, it isn't virtualization.
const CHUNK_SIZE = 100;
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
      const itemDate = item.startDateAndTime
        .withTimeZone(LocalTime.conventionTimeZone)
        .round({ smallestUnit: "day", roundingMode: "floor" });
      if (cur === null || !itemDate.equals(cur.date)) {
        cur = { key: itemDate.toString(), date: itemDate, items: [] };
        out.push(cur);
      }
      cur.items.push(item);
    });
    return out;
  }, [program]);

  // Corrections when `program` changes shape, made during render (an
  // effect would show the uncorrected state for a frame):
  // - A list that had emptied out resumes at INITIAL_CHUNK_SIZE so results
  //   appear in this same commit, not after the first low-priority chunk.
  // - A shrunken list clamps visibleCount down - not for rendering (the
  //   day loop below caps naturally) but so that re-growing goes through
  //   the chunked transitions again instead of one giant synchronous
  //   commit.
  let effectiveVisibleCount = visibleCount;
  if (visibleCount === 0 && program.length > 0) {
    effectiveVisibleCount = Math.min(INITIAL_CHUNK_SIZE, program.length);
    setVisibleCount(effectiveVisibleCount);
  } else if (visibleCount > program.length) {
    effectiveVisibleCount = program.length;
    setVisibleCount(effectiveVisibleCount);
  }

  useEffect(() => {
    // Each chunk is revealed inside a transition, keeping the mount
    // low-priority and interruptible by input. The next chunk is queued
    // when the previous one settles (isPending flips false and this effect
    // re-fires), so a slow chunk delays the next rather than piling up.
    if (!isPending && visibleCount < program.length) {
      startTransition(() => {
        setVisibleCount((count) => Math.min(count + CHUNK_SIZE, program.length));
      });
    }
  }, [isPending, visibleCount, program, startTransition]);
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
        date={day.date}
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
  const loadingMore =
    effectiveVisibleCount < program.length ? (
      <div className="program-loading-more" role="status">
        <span className="program-loading-more-spinner" aria-hidden="true" />
        {configData.PROGRAM.LOADING_MORE_MESSAGE}
      </div>
    ) : null;

  return (
    <div className="program-container">
      {conventionTime}
      {localTime}
      <div className="program">{rows}</div>
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
