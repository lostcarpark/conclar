import PropTypes from "prop-types";
import configData from "../config.json";
import Navigation from "./Navigation";
import HelpText from "./HelpText";

const headerImg = configData.HEADER.IMG_SRC ? <img src={configData.HEADER.IMG_SRC} alt={configData.HEADER.IMG_ALT_TEXT}></img> : "";
const showBreak = configData.HEADER.LINEFEED_AFTER_URL ? <br /> : "";

const Header = ({ title, showNavigation = true }) => {
  document.title = title;
  return (
    <header>
      {headerImg}
      {showBreak}
      <h1>{title}</h1>
      { showNavigation ? <Navigation /> : <></> }
      <HelpText />
    </header>
  );
};

Header.defaultProps = {
  title: "Programme Guide",
};

Header.propTypes = {
  title: PropTypes.string,
};

export default Header;
