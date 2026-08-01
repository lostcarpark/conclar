import { Format } from "../utils/Format";
import { slugify } from "../utils/Slug";
import configData from "../config.json";
import Icon from "./Icon";

const Tag = ({ tag }) => {
  const iconConfig = configData.TAGS.ICONS?.[tag.value];
  const categoryClass = tag.category
    ? ` item-tag-${slugify(tag.category)}`
    : "";
  return (
    <div className={`item-tag${categoryClass}`}>
      {iconConfig && (
        <Icon
          icon={iconConfig.ICON_NAME}
          iconUrl={iconConfig.ICON_URL}
          className="tag-icon"
        />
      )}
      {Format.formatTag(tag.label)}
    </div>
  );
};

export default Tag;
