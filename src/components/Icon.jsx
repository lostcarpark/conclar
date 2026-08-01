import iconsByName from "virtual:config-icons";

const Icon = ({ icon, iconUrl, className = "nav-icon" }) => {
  // `icon` is either a component (hardcoded core icons) or a name resolved
  // via the build-time generated set (see configIconsPlugin in vite.config.js).
  const IconComponent = typeof icon === "string" ? iconsByName[icon] : icon;
  if (IconComponent) {
    return <IconComponent className={className} aria-hidden="true" />;
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

export default Icon;
