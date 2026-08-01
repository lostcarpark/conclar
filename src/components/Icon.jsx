import iconsByName from "virtual:config-icons";

const Icon = ({ icon, iconName, iconUrl, className = "nav-icon" }) => {
  // Core call sites pass a component directly; config-driven call sites pass
  // a name resolved via the build-time generated set (see configIconsPlugin
  // in vite.config.js). Either way we end up with a component.
  const IconComponent = icon || iconsByName[iconName];
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
