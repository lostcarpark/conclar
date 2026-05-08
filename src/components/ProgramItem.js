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

const ProgramItem = ({ item, forceExpanded, now }) => {
  const showLocalTime = useStoreState((state) => state.showLocalTime);
  const show12HourTime = useStoreState((state) => state.show12HourTime);
  const timeZoneIsShown = useStoreState((state) => state.timeZoneIsShown);

  const selected = useStoreState((state) => state.isSelected(item.id));
  const { addSelection, removeSelection } = useStoreActions((actions) => ({
    addSelection: actions.addSelectionAndSync,
    removeSelection: actions.removeSelectionAndSync,
  }));

  const expanded = useStoreState((state) => state.isExpanded(item.id));
  const { expandItem, collapseItem } = useStoreActions((actions) => ({
    expandItem: actions.expandItem,
    collapseItem: actions.collapseItem,
  }));

  // Used to resolve the parent session's title for the "Part of:" kicker.
  const program = useStoreState((state) => state.program);

  function toggleExpanded() {
    if (configData.INTERACTIVE) {
      if (expanded) {
        // Check for selection text. Only collapse if empty so users can select items.
        if (window.getSelection().toString() === "") collapseItem(item.id);
      } else expandItem(item.id);
    }
  }

  function handleSelected(event) {
    if (event.target.checked) addSelection(item.id);
    else removeSelection(item.id);
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
const parentTag = (item.tags || []).find((t) => {
  if (typeof t === "string") return t.toLowerCase().startsWith("parent:");
  if (t && typeof t === "object") {
    if (typeof t.category === "string" && t.category.toLowerCase() === "parent") return true;
    if (typeof t.label === "string" && t.label.toLowerCase().startsWith("parent:")) return true;
    if (typeof t.value === "string" && t.value.toLowerCase().startsWith("parent:")) return true;
  }
  return false;
});
const parentId = (() => {
  if (!parentTag) return null;
  if (typeof parentTag === "string") return parentTag.split(":")[1];
  if (parentTag.category && parentTag.category.toLowerCase() === "parent") return parentTag.value;
  const s = parentTag.label || parentTag.value || "";
  return s.includes(":") ? s.split(":")[1] : null;
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
    <span className="item-type-badge">{typeTag.label}</span>
  ) : null;

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

  const duration =
    configData.DURATION.SHOW_DURATION && item.mins ? (
      <div className="item-duration">
        {configData.DURATION.DURATION_LABEL.replace("@mins", item.mins)}
      </div>
    ) : (
      ""
    );

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
  console.log(localTime);
  let startTime;
  if (localTime) {
    startTime = configData.START_TIME.START_TIME_WITH_LOCAL_LABEL.replace(
      "@local_time",
      localTime
    ).replace("@con_time", conTime);
  } else {
    startTime = configData.START_TIME.START_TIME_LABEL.replace(
      "@con_time",
      conTime
    );
  }

  const [ref, bounds] = useMeasure();
  const showExpanded = !configData.INTERACTIVE || expanded || forceExpanded;
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

  return (
    <div id={id} className={`item ${isChild ? "program-item--child" : ""}`}>
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
      <div className="item-entry" onClick={toggleExpanded}>
        <button id={'header-' + id} className="item-header" aria-expanded={showExpanded} aria-controls={'details-' + id}>
          {parentTitle && (
            <div className="item-parent">Part of: {parentTitle}</div>
          )}
          <h3 className="item-title">
            {item.title}
            {typeBadge}
            {chevron}
          </h3>
          <div className="item-line2">
            <div className="item-location">{locations}</div>
            <div className="item-start-time">{startTime}</div>
            {duration}
          </div>
        </button>
        {detailsVisible && (
          <animated.div className="item-details" style={itemExpandedStyle} id={'details-' + id} role="region" aria-labelledby={'header-' + id}>
            <div className="item-details-expanded" ref={ref}>
              {permaLink}
              <div className="item-people">
                <ul>{people}</ul>
              </div>
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
