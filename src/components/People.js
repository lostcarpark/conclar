import React, { useState } from "react";
import PropTypes from "prop-types";
import Participant from "./Participant";

const People = ({ people }) => {
  const storedThumbnails = localStorage.getItem('thumbnails'); // Get default thumbnails from local storage.
  const [thumbnails, setThimbnails] = useState(storedThumbnails === 'false' ? false : true); // Default to true unless false explicitly stored.
  //console.log(people);
  const rows = [];
  people.forEach((person) => {
    rows.push(<Participant key={person.id} person={person} thumbnails={thumbnails} />);
  });

  function handleThumbnail(event) {
    setThimbnails(event.target.checked);
    localStorage.setItem('thumbnails', event.target.checked ? 'true' : 'false');
  }

  return (
    <div className="people">
      <div className="people-settings">
        <input id="thumbnails" name="thumbnails" type="checkbox" checked={thumbnails} onChange={handleThumbnail} />
        <label htmlFor="thumbnails">Show thumbnails</label>
      </div>
      <ul>{rows}</ul>
    </div>
  );
};

People.propTypes = {
  people: PropTypes.array,
};

export default People;
