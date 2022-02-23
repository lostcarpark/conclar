import DOMPurify from "dompurify";
import { useStoreState, useStoreActions } from "easy-peasy";
import { Link } from "react-router-dom";
import useMeasure from "react-use-measure";
import { useSpring, animated } from "react-spring";
import { IoChevronDownCircle } from "react-icons/io5";
import { HiLink } from "react-icons/hi";
import Location from "./Location";
import Tag from "./Tag";
import Participant from "./Participant";
import configData from "../config.json";
import PropTypes from "prop-types";

const ProgramItem = ({ item, forceExpanded }) => {
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
      if (expanded) collapseItem(item.id);
      else expandItem(item.id);
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
  for (let tag of item.tags) {
    tags.push(<Tag key={tag} tag={tag} />);
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

  const links = (configData.LINKS).map((link) => (
    item.links && item.links[link.NAME] && item.links[link.NAME].length ? (
      <div className="item-links-{link.NAME]}">
        <a href={item.links[link.NAME]}>{link.TEXT}</a>
      </div>
    ) : (
      ""
    )
  )
  );

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
  const chevronExpandedClass = showExpanded ? " item-chevron-expanded" : "";
  const chevronExpandedStyle = useSpring({
    transform: showExpanded ? "rotate(180deg)" : "rotate(0deg)",
  });
  const itemExpandedStyle = useSpring({
    height: showExpanded ? bounds.height : 0,
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
            type="checkbox"
            className="selection-control"
            checked={selected}
            onChange={handleSelected}
          />
        </div>
      </div>
      <div className="item-entry" onClick={toggleExpanded}>
        <div className="item-title">
          {chevron}
          {item.title}
        </div>
        <div className="item-line2">
          <div className="item-location">{locations}</div>
          {duration}
        </div>
        <animated.div className="item-details" style={itemExpandedStyle}>
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
            <div className="item-links">
              {links}
            </div>
          </div>
        </animated.div>
      </div>
    </div>
  );
};

ProgramItem.defaultProps = {
  forceExpanded: false,
};

ProgramItem.propTypes = {
  forceExpanded: PropTypes.bool,
};

export default ProgramItem;
