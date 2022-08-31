import TagSelect from "./TagSelect";

const TagSelectors = ({ tags, selTags, setSelTags, tagConfig, resetLimit }) => {
  /**
   * Get the tag information for the tag category.
   * @param {string} tag The tag category.
   * @returns {object} The tag config information.
   */
  function findTagData(tag) {
    // Check for day tag.
    if (tag === "days" && tagConfig.DAY_TAG.GENERATE)
      return tagConfig.DAY_TAG;
    const tagData = tagConfig.SEPARATE.find(
      (item) => item.PREFIX === tag
    );
    if (tagData !== undefined) return tagData;
    // Tag not found in config, so return default.
    return tagConfig;
  }

  const tagFilters = [];
  for (const tag in tags) {
    const tagData = findTagData(tag);
    // Only add drop-down if tag type actually contains elements, and isn't marked hidden in config.
    if (tags[tag].length && !tagData.HIDE) {
      tagFilters.push(
        <div key={tag} className={"filter-tags filter-tags-" + tag}>
          <TagSelect
            options={tags[tag]}
            tag={tag}
            selTags={selTags}
            setSelTags={setSelTags}
            tagData={tagData}
            resetLimit={resetLimit}
          />
        </div>
      );
    }
  }
  return <>{tagFilters}</>;
};

export default TagSelectors;
