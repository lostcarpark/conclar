import { Format } from '../utils/Format'

// The trailing separator is now inserted via CSS (.item-tag:not(:last-child)::after)
// so the last tag in a list doesn't get a stray trailing comma.
const Tag = ({ tag }) => {
  return <div className="item-tag">{Format.formatTag(tag)}</div>;
};

export default Tag;
