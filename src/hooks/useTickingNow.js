import { useState, useEffect } from "react";
import { Temporal } from "@js-temporal/polyfill";

const TICK_INTERVAL_MS = 10000;

/**
 * A Temporal.ZonedDateTime that updates every 10 seconds, for components
 * that depend on wall-clock time (e.g. "hide past items", link WHEN
 * gating). Call this once per mounted route and pass the result down as a
 * `now` prop. Components further down the tree should receive `now` as a
 * prop rather than calling this hook themselves, since each call site gets
 * its own independent timer.
 */
export function useTickingNow() {
  const [now, setNow] = useState(() => Temporal.Now.zonedDateTimeISO("UTC"));
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Temporal.Now.zonedDateTimeISO("UTC"));
    }, TICK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}
