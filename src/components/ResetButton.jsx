import configData from "../config.json";

const ResetButton = ({ isFiltered, resetFilters }) => {
  const button = isFiltered ? (
    <button className="reset-button" onClick={() => resetFilters()}>
      {configData.FILTER.RESET.LABEL}
    </button>
  ) : (
    ""
  );
  return button;
};

export default ResetButton;
