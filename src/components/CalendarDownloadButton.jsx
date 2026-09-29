import PropTypes from "prop-types";
import { HiCalendarDays } from "react-icons/hi2";
import configData from "../config.json";
import { calendarLinkEnabled, downloadListIcs } from "../utils/ICalendar";

const CalendarDownloadButton = ({ items, calendar }) => {
  if (!calendarLinkEnabled()) {
    return null;
  }
  const label = (
    configData.CALENDARLINK.DOWNLOAD_ALL_LABEL ??
    "Download calendar (@count items)"
  ).replace("@count", items.length);
  const title =
    configData.CALENDARLINK.DOWNLOAD_ALL_TITLE ??
    "Download an .ics file to import into your calendar app";
  return (
    <button
      className="calendar-download"
      disabled={items.length === 0}
      onClick={() => downloadListIcs(items, calendar)}
      title={title}
    >
      <HiCalendarDays aria-hidden="true" />
      {label}
    </button>
  );
};

CalendarDownloadButton.propTypes = {
  items: PropTypes.array.isRequired,
  calendar: PropTypes.shape({
    name: PropTypes.string.isRequired,
    fileSuffix: PropTypes.string.isRequired,
  }).isRequired,
};

export default CalendarDownloadButton;
