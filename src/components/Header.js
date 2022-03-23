import PropTypes from "prop-types";

const Header = ({ title }) => {
  document.title = title;
  return (
    <header>
      <img src="/logo-web-small.png" alt="Reclamation Logo" />
      <h1>{title}</h1>
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
