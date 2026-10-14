import React from "react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import configData from "../config.json";

const SharePerson = ({ person }) => {
  const link = window.publicUrl + "people/" + person.id;
  const absLink = `${window.location.origin}${link}`;

  return (
    <div className="share-group">
      <div className="share-head">{configData.PEOPLE.SHARE.LABEL}</div>
      <div className="share-panel">
        {configData.PEOPLE.SHARE.DESCRIPTION}
        <div className="share-link">
          <Link to={link}>{configData.PEOPLE.SHARE.LINK_LABEL}</Link>
        </div>
      </div>
      <div className="share-qr-code">
        <QRCode value={absLink} level="L" />
      </div>
    </div>
  );
};

export default SharePerson;
