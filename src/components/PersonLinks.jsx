import React from "react";
import {
  FaFacebook,
  FaGlobe,
  FaInstagram,
  FaLinkedin,
  FaMastodon,
  FaTiktok,
  FaTumblr,
  FaTwitch,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";
import {
  FaBluesky,
  FaThreads
} from "react-icons/fa6";
import {
  IoLink,
} from "react-icons/io5";


const PersonLinks = ({ person }) => {
  const regex = /^(?:http(s)?:\/\/)[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/;
  /**
   * Take a link type and return an appropriate Icon.
   * @param {string} type
   * @returns {string}
   */
  const getLinkIcon = (type) => {
    switch (type) {
      case "bsky":
      case "bluesky":
        return <FaBluesky />;
      case "fb":
      case "facebook":
        return <FaFacebook />;
      case "instagram":
        return <FaInstagram />;
      case "linkedin":
        return <FaLinkedin />;
      case "mdon":
      case "mast":
      case "mastodon":
        return <FaMastodon />;
      case "tiktok":
        return <FaTiktok />;
      case "threads":
        return <FaThreads />
      case "tumblr":
        return <FaTumblr />
      case "twitch":
        return <FaTwitch />;
      case "twitter":
        return <FaTwitter />;
      case "website":
        return <FaGlobe />;
      case "youtube":
      case "yt":
        return <FaYoutube />;
      default:
        return <IoLink />;
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
    if (type === "img" || type === "photo" || type === "img_256_url") continue;
    // If link not fitting web url template, ignore.
    if (!person.links[type].match(regex)) continue;
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
