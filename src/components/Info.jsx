import { useStoreState } from "easy-peasy";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Info = () => {
  const info = useStoreState((state) => state.info);

  return (
    <div className="info">
      <ReactMarkdown children={info} remarkPlugins={[remarkGfm]} />
    </div>
  );
};

export default Info;
