import { useState, useEffect } from "react";
import { useStoreState } from "easy-peasy";
import { programTimeAt, crossedBoundary } from "../utils/ProgramTime";

const TICK_INTERVAL_MS = 10000;

/**
 * The programme clock, as a reading of query methods (see
 * utils/ProgramTime). Call this once per mounted route and pass the
 * result down as a `programTime` prop; components further down the tree
 * should receive it as a prop rather than calling this hook themselves,
 * since each call site gets its own independent timer.
 *
 * The clock is checked every 10 seconds, but a new reading is only
 * published when the tick crossed a programme time boundary (the store's
 * timeBoundaries computed) - on any other tick the state update bails
 * out with the previous reading, so the tree above the items isn't
 * reconciled every 10 seconds just to compute the same answers.
 */
export function useProgramTime() {
  const program = useStoreState((state) => state.program);
  const boundaries = useStoreState((state) => state.timeBoundaries);
  const [current, setCurrent] = useState(() => {
    const epochMs = Date.now();
    return { program, epochMs, programTime: programTimeAt(epochMs, program) };
  });
  // A reading captures the programme it was taken against, so a new
  // programme (initial load, background refresh) invalidates it
  // regardless of the clock. Adjusted during render so no frame shows a
  // reading of the old programme against the new one.
  if (current.program !== program) {
    const epochMs = Date.now();
    setCurrent({
      program,
      epochMs,
      programTime: programTimeAt(epochMs, program),
    });
  }
  useEffect(() => {
    const timer = setInterval(() => {
      const epochMs = Date.now();
      setCurrent((prev) =>
        crossedBoundary(boundaries, prev.epochMs, epochMs)
          ? {
              program: prev.program,
              epochMs,
              programTime: programTimeAt(epochMs, prev.program),
            }
          : prev
      );
    }, TICK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [boundaries]);
  return current.programTime;
}
