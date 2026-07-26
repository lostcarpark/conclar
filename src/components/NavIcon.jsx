import {
  FaComment,
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
  FaPen,
  FaPlayCircle,
  FaQuestionCircle,
  FaTicketAlt,
  FaTwitter,
  FaVideo,
  FaYoutube,
} from "react-icons/fa";

// Curated set of icons that can be referenced by name from config (the
// NAVIGATION.EXTRA[].ICON_NAME field, e.g. "Home"). Named imports keep these
// tree-shakeable. To offer a new icon, import it above and add it here using
// the name without the "Fa" prefix. Links needing an icon outside this set can
// use ICON_URL instead.
const iconsByName = {
  Comment: FaComment,
  Discord: FaDiscord,
  Envelope: FaEnvelope,
  Facebook: FaFacebook,
  Globe: FaGlobe,
  Home: FaHome,
  Instagram: FaInstagram,
  Map: FaMap,
  Mastodon: FaMastodon,
  PaperPlane: FaPaperPlane,
  Pen: FaPen,
  Play: FaPlayCircle,
  Question: FaQuestionCircle,
  Sign: FaMapSigns,
  Ticket: FaTicketAlt,
  Twitter: FaTwitter,
  Video: FaVideo,
  Youtube: FaYoutube,
};

const NavIcon = ({ icon, iconName, iconUrl, className = "nav-icon" }) => {
  // Core links pass a component directly; EXTRA links pass a config name we
  // resolve via the curated set. Either way we end up with a component.
  const Icon = icon || iconsByName[iconName];
  if (Icon) {
    return <Icon className={className} aria-hidden="true" />;
  }
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        aria-hidden="true"
        className={className + " " + className + "-img"}
      />
    );
  }
  return <span className={className} aria-hidden="true" />;
};

export default NavIcon;
