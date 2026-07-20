import { useMemo } from "react";
import ReactSelect from "react-select";
import PropTypes from "prop-types";
import { Temporal } from "@js-temporal/polyfill";

/**
 * IANA timezone picker backed by the browser's own timezone data
 * (Intl.supportedValuesOf) instead of a bundled database - replacing
 * react-timezone-select, whose spacetime/timezone-soft dependencies were
 * ~14% of the vendor bundle.
 */

function buildOptions() {
  const zones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [Intl.DateTimeFormat().resolvedOptions().timeZone];
  const now = Temporal.Now.instant();
  return zones
    .map((zone) => {
      let offsetNs = 0;
      let label = zone.replace(/_/g, " ");
      try {
        const zoned = now.toZonedDateTimeISO(zone);
        offsetNs = zoned.offsetNanoseconds;
        label += ` (GMT${zoned.offset})`;
      } catch {
        // Zone unknown to the Temporal polyfill: fall through with the
        // bare name, sorted alongside UTC.
      }
      return { value: zone, label, offsetNs };
    })
    .sort(
      (a, b) => a.offsetNs - b.offsetNs || a.value.localeCompare(b.value)
    );
}

const TimeZoneSelect = ({ value, onChange, className, classNamePrefix }) => {
  const options = useMemo(buildOptions, []);
  const selected =
    options.find((option) => option.value === value) ?? {
      value,
      label: value,
    };
  return (
    <ReactSelect
      value={selected}
      onChange={onChange}
      options={options}
      className={className}
      classNamePrefix={classNamePrefix}
    />
  );
};

TimeZoneSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
  classNamePrefix: PropTypes.string,
};

export default TimeZoneSelect;
