import DOMPurify from "dompurify";
import { useStoreState, useStoreActions } from "easy-peasy";
import Location from "./Location";
import Tag from "./Tag";
import Participant from "./Participant";
import configData from "../config.json";
//import PropTypes from 'prop-types'

const ProgramItem = ({ item }) => {
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

  const tags = [];
  for (let tag of item.tags) {
    tags.push(<Tag key={tag} tag={tag} />);
  }

  const people = [];
  if (item.people) {
    item.people.forEach((person) => {
      people.push(<Participant key={person.id} person={person} />);
    });
  }
  const safeDesc = DOMPurify.sanitize(item.desc);
  const meetingLink =
    item.links && item.links.meeting && item.links.meeting.length ? (
      <div className="item-links-meeting">
        <a href={item.links.meeting}>{configData.LINKS.MEETING}</a>
      </div>
    ) : (
      ""
    );
  const recordingLink =
    item.links && item.links.recording && item.links.recording.length ? (
      <div className="item-links-recording">
        <a href={item.links.recording}>{configData.LINKS.RECORDING}</a>
      </div>
    ) : (
      ""
    );
  const duration =
    configData.DURATION.SHOW_DURATION && item.mins ? (
      <div className="item-duration">
        {configData.DURATION.DURATION_LABEL.replace("@mins", item.mins)}
      </div>
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
        <div className="item-title">{item.title}</div>
        <div className="item-line2">
          <div className="item-location">{locations}</div>
          {duration}
        </div>
        <div
          className={
            expanded ? "item-details item-details-expanded" : "item-details"
          }
        >
          <div className="item-people">
            <ul>{people}</ul>
          </div>
          <div className="item-tags">{tags}</div>
          <div
            className="item-description"
            dangerouslySetInnerHTML={{ __html: safeDesc }}
          />
          <div className="item-links">
            {meetingLink}
            {recordingLink}
          </div>
        </div>
      </div>
    </div>
  );
};

// ProgramItem.PropTypes = {
//     item: PropTypes.object
// }

export default ProgramItem;
