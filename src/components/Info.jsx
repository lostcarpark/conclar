import { useEffect } from "react";
import { useStoreState, useStoreActions } from "easy-peasy";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Info = () => {
  const info = useStoreState((state) => state.info);
  const fetchInfo = useStoreActions((actions) => actions.fetchInfo);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return (
    <div className="info">
      <ReactMarkdown children={info} remarkPlugins={[remarkGfm]} />
    </div>
  );
};

export default Info;
