import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { IoPerson } from "react-icons/io5";
import configData from "../config.json";
import { slugify, shortId } from "../utils/Slug";

const PersonTag = ({ person, moderator }) => {
  const label = moderator
    ? `${person.name} ${configData.PEOPLE.MODERATORS.MODERATOR_LABEL}`
    : person.name;

  return (
    <div className="item-tag item-tag-people">
      <IoPerson className="tag-icon" />
      {configData.INTERACTIVE ? (
        <Link to={"/people/" + shortId(person.id) + "/" + slugify(person.name)}>
          {label}
        </Link>
      ) : (
        label
      )}
    </div>
  );
};

PersonTag.propTypes = {
  moderator: PropTypes.bool,
};

export default PersonTag;
