import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import configData from "../config.json";

const Participant = ({ person, thumbnails }) => {
  function getParticipantThumbnail(person) {
    if (thumbnails) {
      if (person.links && person.links.img) { //konopas format
        return (
          <div className="participant-image">
            <img src={person.links.img} alt={person.name} onError={({ currentTarget }) => {
              currentTarget.onerror = null;
              currentTarget.style.display="none";
            }} />
          </div>
        );
      }
      if (person.image_256_url) { //grenadine format
        return (
          <div className="participant-image">
            <img src={person.image_256_url} alt={person.name} onError={({ currentTarget }) => {
              currentTarget.onerror = null;
              currentTarget.style.display="none";
            }} />
          </div>
        );
      }
      if (
        configData.PEOPLE.THUMBNAILS &&
        configData.PEOPLE.THUMBNAILS.DEFAULT_IMAGE
      ) {
        return (
          <div className="participant-image participant-default-image">
            <img
              src={configData.BASE_PATH + configData.PEOPLE.THUMBNAILS.DEFAULT_IMAGE}
              alt={person.name}
            />
          </div>
        );
      }
    }
    return "";
  }

  return (
    <li className="participant">
      <Link to={"/people/" + person.id}>
        {getParticipantThumbnail(person)}
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
