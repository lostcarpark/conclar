import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import configData from "../config.json";

const Info = ({ info, infoIsLoaded }) => {
  const renderedInfo = infoIsLoaded ? (
    <ReactMarkdown children={info} remarkPlugins={[remarkGfm]} />
  ) : (
    configData.INFORMATION.LOADING_MESSAGE
  );
  return <div className="info">{renderedInfo}</div>;
};

export default Info;
