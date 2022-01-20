import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import configData from "../config.json";

const Info = ({ info }) => {
  if (info === null) {
    return <div className="info info-loading">{configData.INFORMATION.LOADING_MESSAGE}</div>;
  }
  return <div className="info"><ReactMarkdown children={info} remarkPlugins={[remarkGfm]} /></div>;
};

export default Info;
