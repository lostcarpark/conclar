import { NavLink } from "react-router-dom";
import configData from "../config.json";
import UserStatus from "./UserStatus";

const Navigation = ({ onNavigate } = {}) => {
  const infoLink =
    "INFO" in configData.NAVIGATION ? (
      <li>
        <NavLink to="/info" onClick={onNavigate}>{configData.NAVIGATION.INFO}</NavLink>
      </li>
    ) : (
      <></>
    );
  const extraLinks = [];
  if ("EXTRA" in configData.NAVIGATION) {
    for (let link of configData.NAVIGATION.EXTRA) {
      extraLinks.push(
        <li key={link.URL}>
          <a href={link.URL} onClick={onNavigate}>{link.LABEL}</a>
        </li>
      );
    }
  }
  return (
    <nav className="navigation">
      <ul>
        <li>
          <NavLink to="/" onClick={onNavigate}>{configData.NAVIGATION.PROGRAM}</NavLink>
        </li>
        <li>
          <NavLink to="/people" onClick={onNavigate}>{configData.NAVIGATION.PEOPLE}</NavLink>
        </li>
        <li>
          <NavLink to="/myschedule" onClick={onNavigate}>{configData.NAVIGATION.MYSCHEDULE}</NavLink>
        </li>
        {infoLink}
        <li>
          <NavLink to="/settings" onClick={onNavigate}>{configData.NAVIGATION.SETTINGS}</NavLink>
        </li>
        {extraLinks}
        <UserStatus />
      </ul>
    </nav>
  );
};

export default Navigation;
