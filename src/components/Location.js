// The separator between locations is inserted via CSS
// (.item-location > span:not(:last-child)::after) so the last location
// in a list doesn't get a stray trailing comma.
const Location = ({ loc }) => {
  return <span>{loc}</span>;
};

export default Location;
