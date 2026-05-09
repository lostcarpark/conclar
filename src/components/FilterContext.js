import { createContext, useContext } from "react";

/**
 * Set of item ids that matched the current filter on their own merit
 * (i.e. before parent-completion folded their parents in).  Or `null`
 * when no filter is active.
 *
 * Provided by FilterableProgram and consumed by ProgramItem so it can
 * decide whether to render all children of a parent or only the
 * children that were direct filter matches.
 */
export const FilterContext = createContext(null);

export const useDirectMatchedIds = () => useContext(FilterContext);
