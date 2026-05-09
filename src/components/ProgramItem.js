import DOMPurify from "dompurify";
import { useStoreState, useStoreActions } from "easy-peasy";
import { Link } from "react-router-dom";
import useMeasure from "react-use-measure";
import { useSpring, animated } from "react-spring";
import { IoChevronDownCircle } from "react-icons/io5";
import { HiLink } from "react-icons/hi";
import ItemLink from "./ItemLink";
import Location from "./Location";
import Tag from "./Tag";
import Participant from "./Participant";
import configData from "../config.json";
import PropTypes from "prop-types";
import { Temporal } from "@js-temporal/polyfill";
import { useState, useEffect } from "react";
import { LocalTime } from "../utils/LocalTime";
import { useDirectMatchedIds } from "./FilterContext";

const ProgramItem = ({ item, forceExpanded, now }) => {
  const showLocalTime = useStoreState((state) => state.showLocalTime);
  const show12HourTime = useStoreState((state) => state.show12HourTime);
  const timeZoneIsShown = useStoreState((state) => state.timeZoneIsShown);

  const selected = useStoreState((state) => state.isSelected(item.id));
  const { addSelections, removeSelections, showNotification } = useStoreActions(
    (actions) => ({
      addSelections: actions.addSelectionsAndSync,
      removeSelections: actions.removeSelectionsAndSync,
      showNotification: actions.showNotification,
    })
  );
  // Full programChildren map so we can BFS descendants when this item
  // is a session being toggled (PR 3 cascade).
  const programChildrenMap = useStoreState((state) => state.programChildren);

  const expanded = useStoreState((state) => state.isExpanded(item.id));
  const { expandItem, collapseItem } = useStoreActions((actions) => ({
    expandItem: actions.expandItem,
    collapseItem: actions.collapseItem,
  }));

  // Used to resolve the parent session's title for the "Part of:" kicker.
  const program = useStoreState((state) => state.program);

  // PR 1: tree-aware nesting. If this item has children (sessions with
  // talks/posters), they render inside this item's DOM rather than as
  // flat siblings.
  const allChildItems = useStoreState((state) => state.programChildren[item.id]) || [];

  // PR 4 polish: when a filter is active, hide non-matching children
  // unless this parent itself was a direct filter match.  Logic:
  //   - No filter active            -> show all children.
  //   - Filter active, parent matched directly -> show all children
  //     (the parent is a "container view" — user wants to see what's
  //     inside this matched session).
  //   - Filter active, parent only here via parent-completion -> show
  //     only the children that were direct matches (the matched needles
  //     in this session's haystack).
  const directMatchedIds = useDirectMatchedIds();
  const childItems = (() => {
    if (!directMatchedIds) return allChildItems;
    if (directMatchedIds.has(item.id)) return allChildItems;
    return allChildItems.filter((c) => directMatchedIds.has(c.id));
  })();
  // `hasChildren` means "this item is a parent of something" — used for
  // the .program-item--parent class regardless of whether a filter is
  // currently hiding the children.
  const hasChildren = allChildItems.length > 0;
  // `childMatched` is true when at least one of this parent's children
  // is in the active filter's direct-match set.  Used to auto-expand a
  // session when search/filter has surfaced something inside it (so the
  // user actually sees what matched, even though sessions are otherwise
  // collapsed by default).
  const childMatched =
    !!directMatchedIds &&
    allChildItems.some((c) => directMatchedIds.has(c.id));

  function toggleExpanded() {
    if (configData.INTERACTIVE) {
      if (expanded) {
        // Check for selection text. Only collapse if empty so users can select items.
        if (window.getSelection().toString() === "") collapseItem(item.id);
      } else expandItem(item.id);
    }
  }

  // PR 3: collect this item's id plus every descendant's id (BFS through
  // programChildren), so toggling a session checkbox cascades to all of
  // its talks/posters in one bulk action.
  function gatherSelfAndDescendants() {
    const out = [item.id];
    const seen = new Set([item.id]);
    const queue = [item.id];
    while (queue.length) {
      const id = queue.shift();
      const kids = programChildrenMap[id] || [];
      for (const k of kids) {
        if (!seen.has(k.id)) {
          seen.add(k.id);
          out.push(k.id);
          queue.push(k.id);
        }
      }
    }
    return out;
  }

  // Plural label for the children's type, used in the cascade toast.
  // Looks at the first child's "Type" tag and best-effort pluralizes.
  function childrenTypeLabel() {
    if (!allChildItems.length) return "items";
    const typeTag = (allChildItems[0].tags || []).find(
      (t) => t && typeof t === "object" && t.category === "Type"
    );
    const label = typeTag && typeof typeTag.label === "string" ? typeTag.label : "";
    if (/^talks?$/i.test(label)) return "talks";
    if (/^posters?$/i.test(label)) return "posters";
    if (label) return label.toLowerCase() + (label.endsWith("s") ? "" : "s");
    return "items";
  }

  function handleSelected(event) {
    const ids = gatherSelfAndDescendants();
    const checked = event.target.checked;
    if (checked) addSelections(ids);
    else removeSelections(ids);

    // Toast when cascading toggled hidden children — i.e. the parent has
    // children, AND some of those children weren't visible at the time
    // of the click (either the parent is collapsed, or a filter narrowed
    // them out).  Avoids surprising the user with "I didn't see those,
    // why are they in my schedule?".
    const visibleNow = showChildren ? childItems.length : 0;
    const hiddenCount = allChildItems.length - visibleNow;
    if (allChildItems.length > 0 && hiddenCount > 0) {
      const total = allChildItems.length;
      const noun = childrenTypeLabel();
      const verb = checked ? "added to" : "removed from";
      showNotification(
        `All ${total} ${noun} in “${item.title}” ${verb} My Schedule.`
      );
    }
  }

  function getRelativeTime(item) {
    if (
      Temporal.ZonedDateTime.compare(now, item.bufferedStartDateAndTime) < 0
    ) {
      return "before";
    } else if (
      Temporal.ZonedDateTime.compare(now, item.bufferedEndDateAndTime) < 0
    ) {
      return "during";
    } else {
      return "after";
    }
  }

 // Find a "parent:<id>" tag in any of the shapes ConClár might emit.
const PARENT_PREFIX = "parent:";
const parentTag = (item.tags || []).find((t) => {
  if (typeof t === "string") return t.toLowerCase().startsWith(PARENT_PREFIX);
  if (t && typeof t === "object") {
    if (typeof t.category === "string" && t.category.toLowerCase() === "parent") return true;
    if (typeof t.label === "string" && t.label.toLowerCase().startsWith(PARENT_PREFIX)) return true;
    if (typeof t.value === "string" && t.value.toLowerCase().startsWith(PARENT_PREFIX)) return true;
  }
  return false;
});
const parentId = (() => {
  if (!parentTag) return null;
  if (typeof parentTag === "string") {
    return parentTag.slice(PARENT_PREFIX.length);
  }
  // When "parent" is declared in TAGS.SEPARATE, t.category is set but
  // t.value still carries the full "parent:<id>" — strip the prefix.
  const v = typeof parentTag.value === "string" ? parentTag.value : "";
  if (v.toLowerCase().startsWith(PARENT_PREFIX)) {
    return v.slice(PARENT_PREFIX.length);
  }
  if (parentTag.category && String(parentTag.category).toLowerCase() === "parent") {
    return v || null;  // bare id case
  }
  const l = typeof parentTag.label === "string" ? parentTag.label : "";
  if (l.toLowerCase().startsWith(PARENT_PREFIX)) {
    return l.slice(PARENT_PREFIX.length);
  }
  return null;
})();
const isChild = !!parentId;

// Look up the parent session's title so we can show it inline.
const parentItem = parentId
  ? (program || []).find((p) => String(p.id) === String(parentId))
  : null;
const parentTitle = parentItem ? parentItem.title : null;

  let id = "item_" + item.id;
  const locations = [];
  if (Array.isArray(item.loc))
    for (let loc of item.loc) {
      locations.push(<Location key={loc} loc={loc} />);
    }
  else locations.push(<Location key={item.loc} loc={item.loc} />);

  const permaLink =
    configData.PERMALINK.SHOW_PERMALINK && configData.INTERACTIVE ? (
      <div className="item-permalink">
        <Link
          to={"/id/" + item.id}
          title={configData.PERMALINK.PERMALINK_TITLE}
        >
          <HiLink />
        </Link>
      </div>
    ) : (
      ""
    );

  const tags = [];
  // Hide Type tags from the expanded tag list — they're surfaced as the
  // always-visible item-type-badge on the title row instead.
  const itemTags = item.tags.filter(
    (tag) =>
      !configData.TAGS.DONTLIST.includes(tag.category) &&
      tag.category !== "Type"
  );

  for (const tag of itemTags) {
    tags.push(<Tag key={tag.value} tag={tag.label} />);
  }

  // Surface the item Type (Poster / Talk / Symposium / etc.) as an
  // always-visible badge inline with the title.
  const typeTag = (item.tags || []).find(
    (tag) => tag && typeof tag === "object" && tag.category === "Type"
  );
  const typeBadge = typeTag ? (
    <span className="item-type-badge" data-type={typeTag.label}>
      {typeTag.label}
    </span>
  ) : null;

  // Visual de-emphasis for non-content rows (breaks, lounges, social
  // events, registration, exhibits, etc.) so attendees can scan past
  // them to the actual sessions. Talk / Poster / Workshop / Symposium
  // (plus Keynote and Award, the high-profile sessions) keep full
  // styling.
  const MUTED_TYPES = new Set([
    "Break",
    "Lounge",
    "Registration",
    "Social",
    "Networking",
    "Exhibits",
    "Business",
    "Other",
    "Student",
  ]);
  const isMuted = !!(typeTag && MUTED_TYPES.has(typeTag.label));

  const people = [];
  if (item.people) {
    item.people.forEach((person) => {
      people.push(
        <Participant
          key={person.id}
          person={person}
          moderator={person.id === item.moderator}
        />
      );
    });
  }

  // Inline byline — the author/moderator names rendered on the
  // always-visible header. Each name is a Link to /people/<id>; the
  // byline div sits OUTSIDE the .item-header <button> (because <a>
  // inside <button> is invalid HTML) but INSIDE the .item-entry so it
  // still reads as part of the same row. Each link stops propagation
  // so navigating to the person page doesn't also toggle expand.
  const moderatorLabel =
    (configData.PEOPLE &&
      configData.PEOPLE.MODERATORS &&
      configData.PEOPLE.MODERATORS.MODERATOR_LABEL) ||
    "(moderator)";
  const peopleInline =
    item.people && item.people.length ? (
      <div className="item-byline">
        {item.people.map((person, i) => (
          <span key={person.id}>
            {i > 0 && ", "}
            <Link
              to={"/people/" + person.id}
              className="item-byline-link"
              onClick={(e) => e.stopPropagation()}
            >
              {person.name}
            </Link>
            {person.id === item.moderator && (
              <span className="moderator"> {moderatorLabel}</span>
            )}
          </span>
        ))}
      </div>
    ) : null;
  const safeDesc = DOMPurify.sanitize(
    item.desc,
    configData.ITEM_DESCRIPTION.PURIFY_OPTIONS
  );

  const links = [];
  if (configData.LINKS) {
    configData.LINKS.forEach((link) => {
      if (item.links && item.links[link.NAME] && item.links[link.NAME].length) {
        const enabled =
          !link.WHEN || link.WHEN.indexOf(getRelativeTime(item)) >= 0;
        links.push(
          <ItemLink
            key={link.NAME}
            name={"item-links-" + link.NAME}
            link={item.links[link.NAME]}
            text={link.TEXT}
            enabled={enabled}
          />
        );
      }
    });
  }

  if ("MAPPING" in configData.LOCATIONS) {
    for (const location of configData.LOCATIONS.MAPPING) {
      if (item.loc.toString() === location.KEY) {
        links.push(
          <ItemLink
            key="map"
            name="item-links-map"
            link={location.MAP_URL}
            text={configData.LOCATIONS.LABEL}
            enabled={true}
          />
        );
      }
    }
  }

  const conTime = LocalTime.formatTimeInConventionTimeZone(
    item.timeSlot,
    item.startDateAndTime,
    show12HourTime,
    timeZoneIsShown
  );
  const localTime =
    showLocalTime === "always" ||
    (showLocalTime === "differs" && LocalTime.timezonesDiffer)
      ? LocalTime.formatTimeInLocalTimeZone(
          item.timeSlot,
          item.startDateAndTime,
          show12HourTime,
          timeZoneIsShown
        )
      : null;

  // Compute end time + formatted strings so we can render the time as a
  // range (e.g. "4:00 pm – 6:00 pm") rather than start + duration label.
  const mins = parseInt(item.mins, 10) || 0;
  const endDateAndTime =
    mins > 0 ? item.startDateAndTime.add({ minutes: mins }) : null;
  const conEndTime = endDateAndTime
    ? LocalTime.formatTime(
        endDateAndTime.withTimeZone(LocalTime.conventionTimeZone),
        show12HourTime,
        timeZoneIsShown
      )
    : null;
  const localEndTime =
    endDateAndTime && localTime
      ? LocalTime.formatTime(
          endDateAndTime.withTimeZone(LocalTime.localTimeZone),
          show12HourTime,
          timeZoneIsShown
        )
      : null;

  // Build the time string. With a known end time, render a range; otherwise
  // fall back to the configured start-time-only label.
  let startTime;
  if (conEndTime) {
    startTime = localEndTime
      ? `${conTime} – ${conEndTime} (${localTime} – ${localEndTime} local)`
      : `${conTime} – ${conEndTime}`;
  } else if (localTime) {
    startTime = configData.START_TIME.START_TIME_WITH_LOCAL_LABEL
      .replace("@local_time", localTime)
      .replace("@con_time", conTime);
  } else {
    startTime = configData.START_TIME.START_TIME_LABEL.replace(
      "@con_time",
      conTime
    );
  }

  // Duration is now redundant with the range; only show it as a fallback
  // when no end time is computable (mins is missing/zero).
  const duration =
    configData.DURATION.SHOW_DURATION && item.mins && !conEndTime ? (
      <div className="item-duration">
        {configData.DURATION.DURATION_LABEL.replace("@mins", item.mins)}
      </div>
    ) : (
      ""
    );

  const [ref, bounds] = useMeasure();
  const showExpanded = !configData.INTERACTIVE || expanded || forceExpanded;
  // Sessions render collapsed by default. Children show when:
  //   - the user has clicked to expand the parent, OR
  //   - a filter has surfaced one of this parent's children (so the
  //     match is actually visible without an extra click).
  const showChildren =
    hasChildren && childItems.length > 0 && (showExpanded || childMatched);
  const [detailsVisible, setDetailsVisible] = useState(showExpanded);

  useEffect(() => {
    if (showExpanded) setDetailsVisible(true);
  }, [showExpanded]);

  const chevronExpandedClass = showExpanded ? " item-chevron-expanded" : "";
  const chevronExpandedStyle = useSpring({
    transform: showExpanded ? "rotate(180deg)" : "rotate(0deg)",
  });
  const itemExpandedStyle = useSpring({
    height: showExpanded ? bounds.height : 0,
    display: "block",
    config: configData.EXPAND.SPRING_CONFIG,
    onRest: () => {
      if (!showExpanded) setDetailsVisible(false);
    },
  });

  const chevron =
    configData.INTERACTIVE && !forceExpanded ? (
      <animated.div
        className={"item-chevron" + chevronExpandedClass}
        style={chevronExpandedStyle}
      >
        <IoChevronDownCircle />
      </animated.div>
    ) : (
      ""
    );

  // An item is "expandable" if its expanded panel has anything to show —
  // a description, links, or nested children. Items without any of those
  // (e.g. Break / Lounge rows that are pure schedule markers) render with
  // no chevron, no toggle, and the permalink in the header instead.
  const hasExpandableContent =
    !!(safeDesc && String(safeDesc).trim()) ||
    hasChildren ||
    links.length > 0;

  return (
    <div id={id}
         className={
           "item"
           + (isChild ? " program-item--child" : "")
           + (hasChildren ? " program-item--parent" : "")
           + (isMuted ? " item--muted" : "")
         }>
      <div className="item-selection">
        <div className="selection">
          <input
            id={"select_" + id}
            type="checkbox"
            className="selection-control"
            checked={selected}
            onChange={handleSelected}
          />
          <label htmlFor={"select_" + id}>
            {"Click to select " + item.title}
          </label>
        </div>
      </div>
      <div
        className="item-entry"
        onClick={hasExpandableContent ? toggleExpanded : undefined}
      >
        {hasExpandableContent ? (
          <button id={'header-' + id} className="item-header" aria-expanded={showExpanded} aria-controls={'details-' + id}>
            {parentTitle && (
              <div className="item-parent">{parentTitle}</div>
            )}
            <h3 className="item-title">
              <span className="item-title-text">{item.title}</span>
              {typeBadge}
              {chevron}
            </h3>
            <div className="item-line2">
              <div className="item-location">{locations}</div>
              <div className="item-start-time">{startTime}</div>
              {duration}
            </div>
          </button>
        ) : (
          // Static (non-expandable) header — same shape as the button
          // version but renders as a plain div, with the permalink taking
          // the chevron's slot since there's no expanded panel to host it.
          <div className="item-header item-header--static">
            {parentTitle && (
              <div className="item-parent">{parentTitle}</div>
            )}
            <h3 className="item-title">
              <span className="item-title-text">{item.title}</span>
              {typeBadge}
              {permaLink}
            </h3>
            <div className="item-line2">
              <div className="item-location">{locations}</div>
              <div className="item-start-time">{startTime}</div>
              {duration}
            </div>
          </div>
        )}
        {peopleInline}
        {hasExpandableContent && detailsVisible && (
          <animated.div className="item-details" style={itemExpandedStyle} id={'details-' + id} role="region" aria-labelledby={'header-' + id}>
            <div className="item-details-expanded" ref={ref}>
              {permaLink}
              <div className="item-tags">{tags}</div>
              <div
                className="item-description"
                dangerouslySetInnerHTML={{ __html: safeDesc }}
              />
              <div className="item-links">{links}</div>
            </div>
          </animated.div>
        )}
      </div>

      {/* PR 1: nested children rendered inside parent's DOM tree.
          Phase 1 collapse: hidden by default, shown when the parent is
          expanded OR when a filter has surfaced a matching child. */}
      {showChildren && (
        <ul className="item-children">
          {childItems.map((child) => (
            <li key={child.id}>
              <ProgramItem
                item={child}
                forceExpanded={forceExpanded}
                now={now}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

ProgramItem.defaultProps = {
  forceExpanded: false,
};

ProgramItem.propTypes = {
  forceExpanded: PropTypes.bool,
  now: PropTypes.instanceOf(Temporal.ZonedDateTime),
};

export default ProgramItem;
