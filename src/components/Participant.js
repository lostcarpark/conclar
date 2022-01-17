import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import configData from "../config.json";

const Participant = ({ person, thumbnails }) => {
  let img =
    thumbnails && person.links && person.links.img ? (
      <div className="participant-image">
        <img src={person.links.img} alt={person.name} />
      </div>
    ) : thumbnails && configData && configData.PEOPLE && configData.PEOPLE.THUMBNAILS.DEFAULT_IMAGE ? (
      <div className="participant-image">
				<img src={configData.PEOPLE.THUMBNAILS.DEFAULT_IMAGE} alt={person.name} />
      </div>
    ) : (
      ""
    );
  return (
    <li className="participant">
      <Link to={"/people/" + person.id}>
        {img}
        <span>{person.name}</span>
      </Link>
    </li>
  );
};

Participant.defaultProps = {
  thumbnails: true,
};

Participant.propTypes = {
  thumbnails: PropTypes.bool,
};

export default Participant;
