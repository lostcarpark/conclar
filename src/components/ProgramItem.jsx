import DOMPurify from "dompurify";
import { useStoreState, useStoreActions } from "easy-peasy";
import { Link } from "react-router-dom";
import { IoChevronDownCircle } from "react-icons/io5";
import { HiLink } from "react-icons/hi";
import { FaStar, FaRegStar } from "react-icons/fa";
import ItemLink from "./ItemLink";
import Location from "./Location";
import Tag from "./Tag";
import Participant from "./Participant";
import { ExpandableDetails } from "./ExpandableDetails";
import configData from "../config.json";
import PropTypes from "prop-types";
import { Temporal } from "@js-temporal/polyfill";
import { useState, useEffect, useMemo, memo } from "react";
import { LocalTime } from "../utils/LocalTime";
import { venueForLocation } from "../utils/Venues";

/**
 * Which side of "now" an item falls on.
 */
function getRelativeTime(item, now) {
  const nowEpochMs = now.epochMilliseconds;
  if (nowEpochMs < item.bufferedStartEpochMs) {
    return "before";
  } else if (nowEpochMs < item.bufferedEndEpochMs) {
    return "during";
  } else {
    return "after";
  }
}

const ProgramItem = ({ item, forceExpanded = false, now }) => {
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

  let id = "item_" + item.id;
  const locations = [];
  if (Array.isArray(item.loc))
    for (let loc of item.loc) {
      locations.push(<Location key={loc} loc={loc} venue={venueForLocation(loc, configData)} />);
    }
  else locations.push(<Location key={item.loc} loc={item.loc} venue={venueForLocation(item.loc, configData)} />);

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
  const itemTags = item.tags.filter(
    (tag) => !configData.TAGS.DONTLIST.includes(tag.category)
  );

  for (const tag of itemTags) {
    tags.push(<Tag key={tag.value} tag={tag.label} />);
  }

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
  const safeDesc = useMemo(
    () => DOMPurify.sanitize(item.desc, configData.ITEM_DESCRIPTION.PURIFY_OPTIONS),
    [item.desc]
  );

  const links = [];
  if (configData.LINKS) {
    configData.LINKS.forEach((link) => {
      if (item.links && item.links[link.NAME] && item.links[link.NAME].length) {
        const enabled =
          !link.WHEN || link.WHEN.indexOf(getRelativeTime(item, now)) >= 0;
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

  const showExpanded = !configData.INTERACTIVE || expanded || forceExpanded;

  // Mounting the details is a one-way latch: once mounted it stays mounted,
  // so the spring keeps its state across repeated expand/collapse.
  // pointerdown/focus fire before the click that actually toggles expansion,
  // so the spring exists with a "collapsed" baseline before the first real
  // transition - without this, the very first expand of any item would snap
  // instead of animate. (See ExpandableDetails for why it isn't simply
  // always mounted.)
  const [animationReady, setAnimationReady] = useState(showExpanded);
  useEffect(() => {
    if (showExpanded) setAnimationReady(true);
  }, [showExpanded]);
  function warmUpAnimation() {
    setAnimationReady(true);
  }

  const chevron =
    configData.INTERACTIVE && !forceExpanded ? (
      <div
        className={"item-chevron" + (showExpanded ? " item-chevron-expanded" : "")}
      >
        <IoChevronDownCircle />
      </div>
    ) : (
      ""
    );

  return (
    <div id={id} className="item">
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
            <span className="selection-star" aria-hidden="true">
              {selected ? <FaStar /> : <FaRegStar />}
            </span>
            <span className="sr-only">
              {(selected ? "Unselect " : "Select ") + item.title}
            </span>
          </label>
        </div>
      </div>
      <div className="item-entry" onClick={toggleExpanded}>
        <button
          id={"header-" + id}
          className="item-header"
          aria-expanded={showExpanded}
          aria-controls={"details-" + id}
          onPointerDown={warmUpAnimation}
          onFocus={warmUpAnimation}
        >
          <h3 className="item-title">
            {item.title}
            {chevron}
          </h3>
          <div className="item-line2">
            <div className="item-location">{locations}</div>
            <div className="item-start-time">{startTime}</div>
            {duration}
          </div>
        </button>
        {animationReady && (
          <ExpandableDetails
            id={id}
            showExpanded={showExpanded}
            permaLink={permaLink}
            people={people}
            tags={tags}
            safeDesc={safeDesc}
            links={links}
          />
        )}
      </div>
    </div>
  );
};

ProgramItem.propTypes = {
  forceExpanded: PropTypes.bool,
  now: PropTypes.instanceOf(Temporal.ZonedDateTime),
};

/**
 * `now` ticks every 10s so relative-time-gated links stay live, but on any
 * given tick almost no item's before/during/after bucket changes. Comparing
 * the bucket (rather than `now` itself) lets those items skip re-rendering.
 */
function areEqual(prevProps, nextProps) {
  if (prevProps.item !== nextProps.item) return false;
  if (prevProps.forceExpanded !== nextProps.forceExpanded) return false;
  return (
    getRelativeTime(prevProps.item, prevProps.now) ===
    getRelativeTime(nextProps.item, nextProps.now)
  );
}

export default memo(ProgramItem, areEqual);
