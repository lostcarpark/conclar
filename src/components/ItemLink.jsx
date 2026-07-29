import NavIcon from "./NavIcon";

const ItemLink = ({ name, link, text, enabled, iconName, iconUrl, reserveIconSpace }) => {
  const showIcon = iconName || iconUrl || reserveIconSpace;
  return <div className={name}>
    <a
      className={enabled ? null : "disabled"}
      href={enabled ? link : null}
      target="_blank"
      rel="noreferrer"
    >
      {showIcon && (
        <NavIcon iconName={iconName} iconUrl={iconUrl} className="item-link-icon" />
      )}
      {text}
    </a>
  </div>;
};

export default ItemLink;
