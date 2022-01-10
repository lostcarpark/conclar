import { Link } from "react-router-dom";

const Participant = ({ person }) => {
  let img =
    person.links && person.links.img ? (
      <img src={person.links.img} alt={person.name} />
    ) : (
      ""
    );
  return (
    <li className="participant">
      <Link to={"/people/" + person.id}>
        <div>{img}</div>
        <span>{person.name}</span>
      </Link>
    </li>
  );
};

export default Participant;
