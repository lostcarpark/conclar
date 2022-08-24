import { useStoreState } from "easy-peasy";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import configData from "../config.json";

const ShareLink = () => {
  const mySchedule = useStoreState((state) => state.getMySchedule);
  // Don't show share link(s) unless there are items in mySchedule.
  if (mySchedule.length === 0) return <></>;
  const links = [];
  let key = 0;
  function addLink(linkItems, multi) {
    const link = configData.BASE_PATH + "ids/" + linkItems;
    const absLink = `${window.location.origin}${link}`;
    links.push(
      <div key={key++} className="share-body">
        <div className="share-link">
          <Link to={link}>
            {multi
              ? configData.PROGRAM.MY_SCHEDULE.SHARE.MULTIPLE_LINK_LABEL.replace(
                  "@number",
                  key + 1
                )
              : configData.PROGRAM.MY_SCHEDULE.SHARE.LINK_LABEL}
          </Link>
        </div>
        <div className="share-qr-code">
          <QRCode value={absLink} />
        </div>
      </div>
    );
  }
  let linkItems = "";
  mySchedule.forEach((item) => {
    // If item would make link exceed maximum length, form link and move on to next one.
    if (
      (linkItems.length + item.id.length) >
      configData.PROGRAM.MY_SCHEDULE.SHARE.MAX_LENGTH
    ) {
      addLink(linkItems, true);
      linkItems = "";
    }
    if (linkItems.length) linkItems += "~";
    linkItems += item.id;
  });
  addLink(linkItems, key > 0);

  const multipleDesc =
    key > 1 ? (
      <div className="share-body">
        {configData.PROGRAM.MY_SCHEDULE.SHARE.MULTIPLE_DESCRIPTION}
      </div>
    ) : (
      ""
    );

  return (
    <div className="share-group select-show-timezone">
      <div className="share-head">
        {configData.PROGRAM.MY_SCHEDULE.SHARE.LABEL}
      </div>
      <div className="share-body">
        {configData.PROGRAM.MY_SCHEDULE.SHARE.DESCRIPTION}
      </div>
      {multipleDesc}
      {links}
    </div>
  );
};

export default ShareLink;
