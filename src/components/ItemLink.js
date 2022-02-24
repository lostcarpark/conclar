
const ItemLink = ({ name, link, text }) => {
  return <div className={name}>
    <a href={link}>{text}</a>
  </div>;
};

export default ItemLink;
