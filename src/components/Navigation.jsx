import { NavLink } from "react-router-dom";
import {
  FaCalendarAlt,
  FaUsers,
  FaStar,
  FaInfoCircle,
  FaCog,
} from "react-icons/fa";
import configData from "../config.json";
import NavIcon from "./NavIcon";
import UserStatus from "./UserStatus";

const Navigation = () => {
  const coreLinks = [
    { to: "/", icon: FaCalendarAlt, label: configData.NAVIGATION.PROGRAM },
    { to: "/people", icon: FaUsers, label: configData.NAVIGATION.PEOPLE },
    { to: "/myschedule", icon: FaStar, label: configData.NAVIGATION.MYSCHEDULE },
    ...("INFO" in configData.NAVIGATION
      ? [{ to: "/info", icon: FaInfoCircle, label: configData.NAVIGATION.INFO }]
      : []),
    { to: "/settings", icon: FaCog, label: configData.NAVIGATION.SETTINGS },
  ];
  const extraLinks = configData.NAVIGATION.EXTRA ?? [];
  return (
    <nav className="navigation">
      <ul>
        {coreLinks.map(({ to, icon, label }) => (
          <li key={to}>
            <NavLink to={to}>
              <NavIcon icon={icon} />
              {label}
            </NavLink>
          </li>
        ))}
        {extraLinks.map((link) => (
          <li className="nav-extra" key={link.URL}>
            <a href={link.URL}>
              <NavIcon iconName={link.ICON_NAME} iconUrl={link.ICON_URL} />
              {link.LABEL}
            </a>
          </li>
        ))}
        <UserStatus />
      </ul>
    </nav>
  );
};

export default Navigation;
