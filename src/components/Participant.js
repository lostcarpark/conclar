import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import configData from "../config.json";

const Participant = ({ person, thumbnails, moderator }) => {
  function getParticipantThumbnail(person) {
    if (thumbnails) {
      if (person.img) {
        return (
          <div className="participant-image">
            <img
              src={person.img}
              alt={person.name}
              onError={({ currentTarget }) => {
                currentTarget.onerror = null;
                currentTarget.style.display = "none";
              }}
            />
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
              src={
                configData.BASE_PATH +
                configData.PEOPLE.THUMBNAILS.DEFAULT_IMAGE
              }
              alt={person.name}
            />
          </div>
        );
      }
    }
    return "";
  }

  function getParticipantName(person, moderator) {
    if (moderator) {
      return (
        <span>
          {person.name}{" "}
          <span className="moderator">
            {configData.PEOPLE.MODERATORS.MODERATOR_LABEL}
          </span>
        </span>
      );
    } else {
      return <span>{person.name}</span>;
    }
  }

  function getParticipant(person) {
    if (configData.INTERACTIVE) {
      return (
        <li className="participant">
          <Link to={"/people/" + person.id}>
            {getParticipantThumbnail(person)}
            {getParticipantName(person, moderator)}
          </Link>
        </li>
      );
    }
    return (
      <li className="participant">
        {getParticipantThumbnail(person)}
        {getParticipantName(person, moderator)}
      </li>
    );
  }

  return getParticipant(person);
};

Participant.defaultProps = {
  thumbnails: true,
};

Participant.propTypes = {
  thumbnails: PropTypes.bool,
};

export default Participant;
