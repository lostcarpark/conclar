import TagSelect from "./TagSelect";

const TagSelectors = ({ tags, selTags, setSelTags, tagConfig, resetLimit, isLoading = false }) => {
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

  // Before data has loaded, tag categories aren't known from data yet (all
  // empty), but the set of categories is defined statically in config - use
  // that so every dropdown still appears (disabled) instead of none at all.
  function categories() {
    if (!isLoading) return Object.keys(tags);
    // Matches the order ProgramData.processTags actually builds the tags
    // object in (per-item categories first, "days" generated last), so the
    // loading skeleton's dropdown order matches the loaded order exactly.
    const keys = tagConfig.SEPARATE.map((item) => item.PREFIX);
    if (tagConfig.DAY_TAG.GENERATE) keys.push("days");
    return keys;
  }

  const tagFilters = [];
  for (const tag of categories()) {
    const tagData = findTagData(tag);
    if (tagData.HIDE) continue;
    // Once loaded, only show drop-downs for tag types that actually contain elements.
    if (!isLoading && !(tags[tag] && tags[tag].length)) continue;
    tagFilters.push(
      <div key={tag} className={"filter-tags filter-tags-" + tag}>
        <TagSelect
          options={tags[tag] || []}
          tag={tag}
          selTags={selTags}
          setSelTags={setSelTags}
          tagData={tagData}
          resetLimit={resetLimit}
          isDisabled={isLoading}
        />
      </div>
    );
  }
  return <>{tagFilters}</>;
};

export default TagSelectors;
