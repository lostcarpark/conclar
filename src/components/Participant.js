import { Link } from "react-router-dom";
import PropTypes from "prop-types";

const Participant = ({ person, thumbnails }) => {
  let img =
    thumbnails && person.links && person.links.img ? (
      <div className="participant-image">
        <img src={person.links.img} alt={person.name} />
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
