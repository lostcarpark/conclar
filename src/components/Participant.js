import { Link } from "react-router-dom";

const Participant = ({ person }) => {
  let img = person.links.img ? <img src={person.links.img} /> : "";
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
