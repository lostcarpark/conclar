import { useStoreActions } from 'easy-peasy';

const ItemLink = ({ name, link, locationCSSSelector, text, enabled }) => {
  if (locationCSSSelector !== "") {
    const showMap = useStoreActions((actions) => actions.showMap);

    return <div className={name}>
      <button className={enabled ? null : "disabled"} onClick={e => {
      e.stopPropagation();
      showMap(locationCSSSelector)}
      }>{text}</button>
    </div>;
  }
  return <div className={name}>
    <a className={enabled ? null : "disabled"} href={enabled ? link : null}>{text}</a>
  </div>;
};

export default ItemLink;
