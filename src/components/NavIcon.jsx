import {
  FaDiscord,
  FaEnvelope,
  FaFacebook,
  FaGlobe,
  FaHome,
  FaInstagram,
  FaMap,
  FaMapSigns,
  FaMastodon,
  FaPaperPlane,
  FaQuestionCircle,
  FaTicketAlt,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";

// Curated set of icons that can be referenced by name from config (the
// NAVIGATION.EXTRA[].ICON_NAME field, e.g. "Home"). Named imports keep these
// tree-shakeable. To offer a new icon, import it above and add it here using
// the name without the "Fa" prefix. Links needing an icon outside this set can
// use ICON_URL instead.
const iconsByName = {
  Discord: FaDiscord,
  Envelope: FaEnvelope,
  Facebook: FaFacebook,
  Globe: FaGlobe,
  Home: FaHome,
  Instagram: FaInstagram,
  Map: FaMap,
  Mastodon: FaMastodon,
  PaperPlane: FaPaperPlane,
  Question: FaQuestionCircle,
  Sign: FaMapSigns,
  Ticket: FaTicketAlt,
  Twitter: FaTwitter,
  Youtube: FaYoutube,
};

const NavIcon = ({ icon, iconName, iconUrl }) => {
  // Core links pass a component directly; EXTRA links pass a config name we
  // resolve via the curated set. Either way we end up with a component.
  const Icon = icon || iconsByName[iconName];
  if (Icon) {
    return <Icon className="nav-icon" aria-hidden="true" />;
  }
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        aria-hidden="true"
        className="nav-icon nav-icon-img"
      />
    );
  }
  return <span className="nav-icon" aria-hidden="true" />;
};

export default NavIcon;
