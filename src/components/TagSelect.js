import ReactSelect from "react-select";

const TagSelect = ({ options, tag, selTags, setSelTags, tagData }) => {
  return (
    <ReactSelect
      placeholder={tagData.PLACEHOLDER}
      options={options}
      isMulti
      isSearchable={tagData.SEARCHABLE}
      value={selTags[tag]}
      onChange={(value) => {
        let selections = { ...selTags };
        selections[tag] = value;
        setSelTags(selections);
      }}
    />
  );
};

export default TagSelect;
