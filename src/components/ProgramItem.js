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

const ProgramItem = ({ item, forceExpanded, now }) => {
  const selected = useStoreState((state) => state.isSelected(item.id));
  const { addSelection, removeSelection } = useStoreActions((actions) => ({
    addSelection: actions.addSelection,
    removeSelection: actions.removeSelection,
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
            {"Click to select " + item.title}
          </label>
        </div>
      </div>
      <div className="item-entry" onClick={toggleExpanded}>
        <button id={'header-' + id} className="item-header" aria-expanded={showExpanded} aria-controls={'details-' + id}>
          <div className="item-title">
            {chevron}
            {item.title}
          </div>
          <div className="item-line2">
            <div className="item-location">{locations}</div>
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
