import { NavLink } from "react-router-dom";
import configData from "../config.json";
import UserStatus from "./UserStatus";

const Navigation = () => {
  const infoLink =
    "INFO" in configData.NAVIGATION ? (
      <li>
        <NavLink to="/info">{configData.NAVIGATION.INFO}</NavLink>
      </li>
    ) : (
      <></>
    );
  const helpLink =
    "HELP" in configData.NAVIGATION ? (
      <li>
        <NavLink to="/help">{configData.NAVIGATION.HELP}</NavLink>
      </li>
    ) : (
      <></>
    );
  const extraLinks = [];
  if ("EXTRA" in configData.NAVIGATION) {
    for (let link of configData.NAVIGATION.EXTRA) {
      extraLinks.push(
        <li key={link.URL}>
          <a href={link.URL}>{link.LABEL}</a>
        </li>
      );
    }
  }
  return (
    <nav className="navigation">
      <ul>
        <li>
          <NavLink to="/">{configData.NAVIGATION.PROGRAM}</NavLink>
        </li>
        <li>
          <NavLink to="/people">{configData.NAVIGATION.PEOPLE}</NavLink>
        </li>
        <li>
          <NavLink to="/myschedule">{configData.NAVIGATION.MYSCHEDULE}</NavLink>
        </li>
        {infoLink}
        {helpLink}
        <li>
          <NavLink to="/settings">{configData.NAVIGATION.SETTINGS}</NavLink>
        </li>
        {extraLinks}
        <UserStatus />
      </ul>
    </nav>
  );
};

export default Navigation;
