import React from "react";
import {
  FaLink,
  FaTwitter,
  FaFacebook,
  FaLinkedin,
  FaInstagram,
  FaTiktok,
  FaTwitch,
  FaYoutube,
  FaGlobe,
} from "react-icons/fa";


const PersonLinks = ({ person }) => {
  const regex = /^(?:http(s)?:\/\/)[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/;
  /**
   * Take a link type and return an appropriate Icon.
   * @param {string} type 
   * @returns {string}
   */
  const getLinkIcon = (type) => {
    switch (type) {
      case "twitter":
        return <FaTwitter />;
      case "fb":
      case "facebook":
        return <FaFacebook />;
      case "instagram":
        return <FaInstagram />;
      case "twitch":
        return <FaTwitch />;
      case "youtube":
        return <FaYoutube />;
      case "tiktok":
        return <FaTiktok />;
      case "linkedin":
        return <FaLinkedin />;
      case "website":
        return <FaGlobe />;
      default:
        return <FaLink />;
    }
  };

  // If person has no links, return empty tag.
  if (!person.hasOwnProperty("links")) {
    return <></>;
  }

  // Array to store HTML for links.
  const links = [];
  // Loop through links, indexed by link type.
  for (const type in person.links) {
    // Don't add image links to link display.
    if (type === "img" || type === "photo" || type === "img_256_url") break;
    // If link not fitting web url template, ignore.
    if (!person.links[type].match(regex)) break;
    // Look up the correct icon.
    const icon = getLinkIcon(type);
    // Add link HTML to array.
    links.push(
      <span className="link" key={type}>
        <a href={person.links[type]} target="_blank" rel="noreferrer">
          {icon}
        </a>
        {" "}
      </span>
    );
  }

  // If no suitable links, return empty tag.
  if (links.length === 0) {
    return <></>;
  }

  // Wrap the link icons in a div.
  return <div className="person-links">{links}</div>;
};

export default PersonLinks;
