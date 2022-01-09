import { Format } from '../Format'

const Tag = ({ tag }) => {
  return <div className="item-tag">{Format.formatTag(tag)}</div>;
};

export default Tag;
