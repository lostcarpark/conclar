import React from "react";
import PropTypes from "prop-types";
import Participant from "./Participant";

const People = ({ people }) => {
  const rows = [];
  people.forEach((person) => {
    rows.push(<Participant key={person.id} person={person} />);
  });
  return (
    <div className="people">
      <ul>{rows}</ul>
    </div>
  );
};

People.propTypes = {
  people: PropTypes.array,
};

export default People;
