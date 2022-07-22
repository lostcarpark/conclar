import configData from "../config.json";
import { useStoreState, useStoreActions } from "easy-peasy";
import { Temporal } from "@js-temporal/polyfill";
import TimezoneSelect from "react-timezone-select";

const Settings = () => {
  const defaultTimezone = Temporal.Now.timeZone().toString();

  const show12HourTime = useStoreState((state) => state.show12HourTime);
  const setShow12HourTime = useStoreActions(
    (actions) => actions.setShow12HourTime
  );

  const showLocalTime = useStoreState((state) => state.showLocalTime);
  const setShowLocalTime = useStoreActions(
    (actions) => actions.setShowLocalTime
  );

  const useTimezone = useStoreState((state) => state.useTimezone);
  const setUseTimezone = useStoreActions((actions) => actions.setUseTimezone);

  const selectedTimezone = useStoreState((state) => state.selectedTimezone);
  const setSelectedTimezone = useStoreActions(
    (actions) => actions.setSelectedTimezone
  );

  const timezoneSelect = useTimezone ? (
    <div>
      <TimezoneSelect
        value={selectedTimezone}
        onChange={(e) => setSelectedTimezone(e.value)}
        labelStyle="abbrev"
      />
    </div>
  ) : (
    ""
  );

  return (
    <div className="settings">
      <h2>{ configData.SETTINGS.TITLE.LABEL }</h2>
      <div className="settings-group time-format">
        <div className="settings-head">{ configData.SETTINGS.TIME_FORMAT.LABEL }</div>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="12hour"
              name="format"
              checked={show12HourTime}
              onChange={(e) => setShow12HourTime(e.target.value === "12hour")}
            />
            { configData.SETTINGS.TIME_FORMAT.T12_HOUR_LABEL }
          </label>
          <label>
            <input
              type="radio"
              value="24hour"
              name="format"
              checked={!show12HourTime}
              onChange={(e) => setShow12HourTime(e.target.value === "12hour")}
            />
            { configData.SETTINGS.TIME_FORMAT.T24_HOUR_LABEL }
          </label>
        </div>
      </div>
      <div className="settings-group select-show-localtime">
        <div className="settings-head">{ configData.SETTINGS.SHOW_LOCAL_TIME.LABEL }</div>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="never"
              name="show_localtime"
              checked={showLocalTime === "never"}
              onChange={(e) => setShowLocalTime(e.target.value)}
            />
            { configData.SETTINGS.SHOW_LOCAL_TIME.NEVER_LABEL }
          </label>
          <label>
            <input
              type="radio"
              value="differs"
              name="show_localtime"
              checked={showLocalTime === "differs"}
              onChange={(e) => setShowLocalTime(e.target.value)}
            />
            { configData.SETTINGS.SHOW_LOCAL_TIME.DIFFERS_LABEL }
          </label>
          <label>
            <input
              type="radio"
              value="always"
              name="show_localtime"
              checked={showLocalTime === "always"}
              onChange={(e) => setShowLocalTime(e.target.value)}
            />
            { configData.SETTINGS.SHOW_LOCAL_TIME.ALWAYS_LABEL }
          </label>
        </div>
      </div>
      <div className="settings-group select-timezone">
        <div className="settings-head">{ configData.SETTINGS.SELECT_TIMEZONE.LABEL }</div>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="default"
              name="method"
              checked={!useTimezone}
              onChange={(e) => setUseTimezone(e.target.value === "select")}
            />
            { configData.SETTINGS.SELECT_TIMEZONE.BROWSER_DEFAULT_LABEL } {defaultTimezone}
          </label>
          <label>
            <input
              type="radio"
              value="select"
              name="method"
              checked={useTimezone}
              onChange={(e) => setUseTimezone(e.target.value === "select")}
            />
            { configData.SETTINGS.SELECT_TIMEZONE.SELECT_LABEL }
          </label>
        </div>
        {timezoneSelect}
      </div>
    </div>
  );
};

export default Settings;
