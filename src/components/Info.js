import ReactMarkdown from "react-markdown";
import configData from "../config.json";
import remarkGfm from 'remark-gfm'

const Info = ({ info, infoIsLoaded }) => {
  const renderedInfo = infoIsLoaded ? (
    <ReactMarkdown children={info} remarkPlugins={[remarkGfm]} />
  ) : (
    configData.INFORMATION.LOADING_MESSAGE
  );
  return <div className="info">{renderedInfo}</div>;
};

export default Info;
