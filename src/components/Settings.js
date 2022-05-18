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
      <h2>Settings</h2>
      <div className="settings-group time-format">
        <div className="settings-head">Time format</div>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="12hour"
              name="format"
              checked={show12HourTime}
              onChange={(e) => setShow12HourTime(e.target.value === "12hour")}
            />
            12 hour
          </label>
          <label>
            <input
              type="radio"
              value="24hour"
              name="format"
              checked={!show12HourTime}
              onChange={(e) => setShow12HourTime(e.target.value === "12hour")}
            />
            24 hour
          </label>
        </div>
      </div>
      <div className="settings-group select-show-localtime">
        <div className="settings-head">Show local time</div>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="never"
              name="show_localtime"
              checked={showLocalTime === "never"}
              onChange={(e) => setShowLocalTime(e.target.value)}
            />
            Never display
          </label>
          <label>
            <input
              type="radio"
              value="differs"
              name="show_localtime"
              checked={showLocalTime === "differs"}
              onChange={(e) => setShowLocalTime(e.target.value)}
            />
            Display if differs from convention time
          </label>
          <label>
            <input
              type="radio"
              value="always"
              name="show_localtime"
              checked={showLocalTime === "always"}
              onChange={(e) => setShowLocalTime(e.target.value)}
            />
            Always show
          </label>
        </div>
      </div>
      <div className="settings-group select-timezone">
        <div className="settings-head">Select timezone</div>
        <div className="settings-radio">
          <label>
            <input
              type="radio"
              value="default"
              name="method"
              checked={!useTimezone}
              onChange={(e) => setUseTimezone(e.target.value === "select")}
            />
            Use browser default timezone: {defaultTimezone}
          </label>
          <label>
            <input
              type="radio"
              value="select"
              name="method"
              checked={useTimezone}
              onChange={(e) => setUseTimezone(e.target.value === "select")}
            />
            Select timezone to use
          </label>
        </div>
        {timezoneSelect}
      </div>
    </div>
  );
};

export default Settings;
