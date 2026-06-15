import PropTypes from "prop-types";
import configData from "../config.json";
import Navigation from "./Navigation";

const headerImg = configData.HEADER.IMG_SRC ? <img src={configData.HEADER.IMG_SRC} alt={configData.HEADER.IMG_ALT_TEXT}></img> : "";
const showBreak = configData.HEADER.LINEFEED_AFTER_URL ? <br /> : "";

// headingHidden keeps the title visible but drops it from the accessibility
// tree (aria-hidden) for contexts where another element already provides the
// page <h1> — e.g. the mobile drawer, where the topbar carries the heading.
const Header = ({ title = "Programme Guide", showNavigation = true, headingHidden = false }) => {
  document.title = title;
  return (
    <header>
      {headerImg}
      {showBreak}
      <h1 aria-hidden={headingHidden || undefined}>{title}</h1>
      { showNavigation ? <Navigation /> : <></> }
    </header>
  );
};

Header.propTypes = {
  title: PropTypes.string,
  headingHidden: PropTypes.bool,
};

export default Header;
