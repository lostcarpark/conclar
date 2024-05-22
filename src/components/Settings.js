import configData from "../config.json";
import { useStoreState, useStoreActions } from "easy-peasy";
import { Temporal } from "@js-temporal/polyfill";
import TimeZoneSelect from "react-timezone-select";

const Settings = () => {
  const defaultTimeZone = Temporal.Now.timeZone().toString();

  const show12HourTime = useStoreState((state) => state.show12HourTime);
  const setShow12HourTime = useStoreActions(
    (actions) => actions.setShow12HourTime
  );

  const showLocalTime = useStoreState((state) => state.showLocalTime);
  const setShowLocalTime = useStoreActions(
    (actions) => actions.setShowLocalTime
  );

  const showTimeZone = useStoreState((state) => state.showTimeZone);
  const setShowTimeZone = useStoreActions((actions) => actions.setShowTimeZone);

  const useTimeZone = useStoreState((state) => state.useTimeZone);
  const setUseTimeZone = useStoreActions((actions) => actions.setUseTimeZone);

  const selectedTimeZone = useStoreState((state) => state.selectedTimeZone);
  const setSelectedTimeZone = useStoreActions(
    (actions) => actions.setSelectedTimeZone
  );

  const darkMode = useStoreState((state) => state.darkMode);
  const setDarkMode = useStoreActions((actions) => actions.setDarkMode);

  const timezoneSelect = useTimeZone ? (
    <div>
      <TimeZoneSelect
        value={selectedTimeZone}
        onChange={(e) => setSelectedTimeZone(e.value)}
        labelStyle="abbrev"
        className="filter-container"
        classNamePrefix="filter-select"
      />
    </div>
  ) : (
    ""
  );

  return (
    <div className="settings">
      <h2>{configData.SETTINGS.TITLE.LABEL}</h2>
      <fieldset className="settings-group time-format">
        <legend className="settings-head">
          {configData.SETTINGS.TIME_FORMAT.LABEL}
        </legend>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="12hour"
              name="format"
              checked={show12HourTime}
              onChange={(e) => setShow12HourTime(e.target.value === "12hour")}
            />
            {configData.SETTINGS.TIME_FORMAT.T12_HOUR_LABEL}
          </label>
          <label>
            <input
              type="radio"
              value="24hour"
              name="format"
              checked={!show12HourTime}
              onChange={(e) => setShow12HourTime(e.target.value === "12hour")}
            />
            {configData.SETTINGS.TIME_FORMAT.T24_HOUR_LABEL}
          </label>
        </div>
      </fieldset>
      <fieldset className="settings-group select-show-localtime">
        <legend className="settings-head">
          {configData.SETTINGS.SHOW_LOCAL_TIME.LABEL}
        </legend>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="never"
              name="show_localtime"
              checked={showLocalTime === "never"}
              onChange={(e) => setShowLocalTime(e.target.value)}
            />
            {configData.SETTINGS.SHOW_LOCAL_TIME.NEVER_LABEL}
          </label>
          <label>
            <input
              type="radio"
              value="differs"
              name="show_localtime"
              checked={showLocalTime === "differs"}
              onChange={(e) => setShowLocalTime(e.target.value)}
            />
            {configData.SETTINGS.SHOW_LOCAL_TIME.DIFFERS_LABEL}
          </label>
          <label>
            <input
              type="radio"
              value="always"
              name="show_localtime"
              checked={showLocalTime === "always"}
              onChange={(e) => setShowLocalTime(e.target.value)}
            />
            {configData.SETTINGS.SHOW_LOCAL_TIME.ALWAYS_LABEL}
          </label>
        </div>
      </fieldset>
      <fieldset className="settings-group select-show-timezone">
        <legend className="settings-head">
          {configData.SETTINGS.SHOW_TIMEZONE.LABEL}
        </legend>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="never"
              name="show_timezone"
              checked={showTimeZone === "never"}
              onChange={(e) => setShowTimeZone(e.target.value)}
            />
            {configData.SETTINGS.SHOW_TIMEZONE.NEVER_LABEL}
          </label>
          <label>
            <input
              type="radio"
              value="if_local"
              name="show_timezone"
              checked={showTimeZone === "if_local"}
              onChange={(e) => setShowTimeZone(e.target.value)}
            />
            {configData.SETTINGS.SHOW_TIMEZONE.IF_LOCAL_LABEL}
          </label>
          <label>
            <input
              type="radio"
              value="always"
              name="show_timezone"
              checked={showTimeZone === "always"}
              onChange={(e) => setShowTimeZone(e.target.value)}
            />
            {configData.SETTINGS.SHOW_TIMEZONE.ALWAYS_LABEL}
          </label>
        </div>
      </fieldset>
      <fieldset className="settings-group select-timezone">
        <legend className="settings-head">
          {configData.SETTINGS.SELECT_TIMEZONE.LABEL}
        </legend>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="default"
              name="method"
              checked={!useTimeZone}
              onChange={(e) => setUseTimeZone(e.target.value === "select")}
            />
            {configData.SETTINGS.SELECT_TIMEZONE.BROWSER_DEFAULT_LABEL}{" "}
            {defaultTimeZone}
          </label>
          <label>
            <input
              type="radio"
              value="select"
              name="method"
              checked={useTimeZone}
              onChange={(e) => setUseTimeZone(e.target.value === "select")}
            />
            {configData.SETTINGS.SELECT_TIMEZONE.SELECT_LABEL}
          </label>
        </div>
        {timezoneSelect}
      </fieldset>
      <fieldset className="settings-group select-dark-mode">
        <legend className="settings-head">
          {configData.SETTINGS.DARK_MODE.LABEL}
        </legend>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="browser"
              name="darkmode"
              checked={darkMode === "browser"}
              onChange={(e) => setDarkMode(e.target.value)}
            />
            {configData.SETTINGS.DARK_MODE.BROWSER_DEFAULT_LABEL}{" "}
            {window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
              ? configData.SETTINGS.DARK_MODE.BROWSER_DARK_LABEL
              : configData.SETTINGS.DARK_MODE.BROWSER_LIGHT_LABEL}
          </label>
        </div>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="light"
              name="darkmode"
              checked={darkMode === "light"}
              onChange={(e) => setDarkMode(e.target.value)}
            />
            {configData.SETTINGS.DARK_MODE.LIGHT_MODE_LABEL}
          </label>
        </div>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="dark"
              name="darkmode"
              checked={darkMode === "dark"}
              onChange={(e) => setDarkMode(e.target.value)}
            />
            {configData.SETTINGS.DARK_MODE.DARK_MODE_LABEL}
          </label>
        </div>
      </fieldset>
    </div>
  );
};

export default Settings;
