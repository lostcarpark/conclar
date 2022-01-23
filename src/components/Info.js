import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import configData from "../config.json";

const Info = () => {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    // Fetch the information page.
    fetch(configData.INFORMATION.MARKDOWN_URL)
      .then((res) => res.text())
      .then((info) => {
        setInfo(info);
      });
    // eslint-disable-next-line
  }, []);

  if (info === null) {
    return (
      <div className="info info-loading">
        {configData.INFORMATION.LOADING_MESSAGE}
      </div>
    );
  }
  return (
    <div className="info">
      <ReactMarkdown children={info} remarkPlugins={[remarkGfm]} />
    </div>
  );
};

export default Info;
