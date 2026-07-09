const Location = ({ loc, venue }) => {
  return (
    <span>
      {loc}
      {venue ? <span className="item-location-venue"> ({venue})</span> : ""}
      {", "}
    </span>
  );
};

export default Location;
