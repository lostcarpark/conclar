import { useStoreState } from "easy-peasy";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeExternalLinks from "rehype-external-links";

const Info = () => {
  const info = useStoreState((state) => state.info);

  return (
    <div className="info">
      <ReactMarkdown children={info} remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeExternalLinks, {target: '_blank'}]]} />
    </div>
  );
};

export default Info;
