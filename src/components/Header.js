import PropTypes from "prop-types";
import HeaderImage from "./HeaderImage";
import Navigation from "./Navigation";
import HelpText from "./HelpText";

const Header = ({ title, showNavigation = true }) => {
  document.title = title;
  return (
    <header>
      <HeaderImage />
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
