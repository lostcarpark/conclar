import { Link } from "react-router-dom";
import configData from "../config.json";

const Navigation = () => {
  const extraLinks = [];
  for (let link of configData.NAVIGATION.EXTRA) {
    extraLinks.push(
      <li key={link.URL}>
        <Link to={link.URL}>{link.LABEL}</Link>
      </li>
    );
  }
  return (
    <nav className="navigation">
      <ul>
        <li>
          <Link to="/">{configData.NAVIGATION.PROGRAM}</Link>
        </li>
        <li>
          <Link to="/people">{configData.NAVIGATION.PEOPLE}</Link>
        </li>
        <li>
          <Link to="/myschedule">{configData.NAVIGATION.MYSCHEDULE}</Link>
        </li>
        <li>
          <Link to="/info">{configData.NAVIGATION.INFO}</Link>
        </li>
        {extraLinks}
      </ul>
    </nav>
  );
};

export default Navigation;
