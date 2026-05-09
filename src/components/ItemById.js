import { useStoreState } from "easy-peasy";
import { useParams } from "react-router-dom";
import { Temporal } from "@js-temporal/polyfill";
import ProgramList from "./ProgramList";
import { extractParentId } from "../model";
import { FilterContext } from "./FilterContext";

/**
 * Render a single program item by id (e.g. /id/<talk-id>).
 *
 * PR 4: if the requested item is a child of a session, also include its
 * ancestor chain in the visible list so the user sees session context
 * around their deep-link target.  Only the requested item is rendered
 * inside its parent (other siblings are hidden via FilterContext) so
 * the page stays focused on what was actually linked to.
 */
const ItemById = () => {
  const program = useStoreState((state) => state.program);
  const programIndex = useStoreState((state) => state.programIndex);
  const params = useParams();

  const item = program.find((it) => it.id.toString() === params.id);
  if (!item) {
    return <ProgramList program={[]} forceExpanded={true} />;
  }

  // Walk up the parent chain (defensive against cycles via a `seen` set).
  const ancestors = [];
  const seen = new Set([item.id]);
  let cur = item;
  while (true) {
    const pid = extractParentId(cur);
    if (!pid || seen.has(pid)) break;
    const parent = programIndex[pid];
    if (!parent) break;
    seen.add(pid);
    ancestors.push(parent);
    cur = parent;
  }

  // Build the visible list and sort it (parent-then-child tiebreak at
  // matching times — mirrors ProgramData.processProgramData).
  const filteredProgram = [item, ...ancestors].sort((a, b) => {
    const cmp = Temporal.ZonedDateTime.compare(
      a.startDateAndTime,
      b.startDateAndTime
    );
    if (cmp !== 0) return cmp;
    return (extractParentId(a) ? 1 : 0) - (extractParentId(b) ? 1 : 0);
  });

  // Only the requested item should render as a "direct match" so that
  // ProgramItem's child-filter logic (PR 4 polish) hides non-matching
  // siblings inside the parent.
  const directMatchedIds = new Set([item.id]);

  return (
    <FilterContext.Provider value={directMatchedIds}>
      <ProgramList program={filteredProgram} forceExpanded={true} />
    </FilterContext.Provider>
  );
};

export default ItemById;
