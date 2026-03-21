import PropTypes from "prop-types";
import HeaderImage from "./HeaderImage";
import { FiX } from "react-icons/fi";
import Navigation from "./Navigation";
import Footer from "./Footer";

const Sidebar = ({ isOpen, onToggle, title }) => {
  document.title = title;
  return (
    <aside className={"sidebar" + (isOpen ? " sidebar-open" : "")}>
      <div className="sidebar-header">
        <h1 className="sidebar-title">
          <HeaderImage />
          {title}
        </h1>
        <button className="sidebar-close-btn" onClick={onToggle} aria-label="Close navigation">
          <FiX />
        </button>
      </div>
      <Navigation onNavigate={onToggle} />
      <div className="sidebar-footer">
        <Footer />
      </div>
    </aside>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
};

export default Sidebar;
