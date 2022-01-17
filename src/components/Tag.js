import { LocalTime } from '../utils/LocalTime'

const Tag = ({ tag }) => {
  return <div className="item-tag">{LocalTime.formatTag(tag)}</div>;
};

export default Tag;
