
const ItemLink = ({ name, link, text, enabled }) => {
  return <div className={name}>
    <a className={enabled ? null : "disabled"} href={enabled ? link : null}>{text}</a>
  </div>;
};

export default ItemLink;
