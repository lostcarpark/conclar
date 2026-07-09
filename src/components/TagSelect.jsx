import ReactSelect from "react-select";

const TagSelect = ({ options, tag, selTags, setSelTags, tagData, resetLimit, isDisabled = false }) => {
  return (
    <ReactSelect
      placeholder={tagData.PLACEHOLDER}
      options={options}
      isMulti
      isDisabled={isDisabled}
      isSearchable={tagData.SEARCHABLE}
      value={selTags[tag]}
      onChange={(value) => {
        resetLimit();
        let selections = { ...selTags };
        selections[tag] = value;
        setSelTags(selections);
      }}
      className="filter-container"
      classNamePrefix="filter-select"
/>
  );
};

export default TagSelect;
