const VENUE_VALUE_PREFIX = "venue:";

/**
 * Whether config.json defines any venues.
 *
 * @param {object} configData Parsed config.json.
 * @returns {boolean}
 */
export function hasVenues(configData) {
  return !!(
    configData.VENUES &&
    Array.isArray(configData.VENUES.MAPPING) &&
    configData.VENUES.MAPPING.length
  );
}

/**
 * The react-select option value used for a venue's "All <venue>" pseudo-option.
 *
 * @param {string} venueName
 * @returns {string}
 */
export function venueOptionValue(venueName) {
  return VENUE_VALUE_PREFIX + venueName;
}

/**
 * Whether a react-select option value refers to a venue (rather than a location).
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isVenueValue(value) {
  return typeof value === "string" && value.startsWith(VENUE_VALUE_PREFIX);
}

/**
 * Extract the venue name from a venue option value.
 *
 * @param {string} value
 * @returns {string}
 */
export function venueNameFromValue(value) {
  return value.slice(VENUE_VALUE_PREFIX.length);
}

/**
 * Build the "All <venue>" label for a venue, using the configured template.
 *
 * @param {object} configData Parsed config.json.
 * @param {string} venueName
 * @returns {string}
 */
export function allVenueLabel(configData, venueName) {
  const template = (configData.VENUES && configData.VENUES.ALL_LABEL) || "All @venue";
  return template.replace("@venue", venueName);
}

/**
 * Find the venue a location belongs to, if any.
 *
 * @param {string} loc Location name.
 * @param {object} configData Parsed config.json.
 * @returns {?string} The venue name, or null if the location isn't mapped to a venue.
 */
export function venueForLocation(loc, configData) {
  if (!hasVenues(configData)) return null;
  const venue = configData.VENUES.MAPPING.find((v) => v.LOCATIONS.includes(loc));
  return venue ? venue.NAME : null;
}

/**
 * Build react-select options for the locations dropdown, grouped by venue.
 * Each venue group is headed by an "All <venue>" pseudo-option, followed by
 * that venue's locations. Locations not belonging to any venue are appended
 * as a trailing, unheaded group. If no venues are configured, returns the
 * locations unchanged (a single flat list).
 *
 * @param {Array<{value: string, label: string}>} locations Locations present in the loaded program.
 * @param {object} configData Parsed config.json.
 * @returns {Array} react-select options, possibly grouped.
 */
export function buildLocationOptions(locations, configData) {
  if (!hasVenues(configData)) return locations;

  const usedLocations = new Set();
  const groups = configData.VENUES.MAPPING.map((venue) => {
    const venueLocations = locations
      .filter((loc) => venue.LOCATIONS.includes(loc.value))
      .sort((a, b) => a.value.localeCompare(b.value));
    venueLocations.forEach((loc) => usedLocations.add(loc.value));
    return {
      label: venue.NAME,
      options: [
        { value: venueOptionValue(venue.NAME), label: allVenueLabel(configData, venue.NAME) },
        ...venueLocations,
      ],
    };
  });

  const ungrouped = locations.filter((loc) => !usedLocations.has(loc.value));
  if (ungrouped.length) {
    const label =
      (configData.VENUES && configData.VENUES.UNGROUPED_LABEL) || "Other";
    groups.push({ label, options: ungrouped });
  }
  return groups;
}

/**
 * Whether a program item's location matches a selected locations-dropdown value,
 * expanding venue values ("venue:Marriott") to all locations in that venue.
 *
 * @param {string} itemLoc A single location from a program item's loc array.
 * @param {string} selectedValue A value from the selected-locations dropdown state.
 * @param {object} configData Parsed config.json.
 * @returns {boolean}
 */
export function locationMatchesSelection(itemLoc, selectedValue, configData) {
  if (isVenueValue(selectedValue)) {
    const venueName = venueNameFromValue(selectedValue);
    const venue = hasVenues(configData)
      ? configData.VENUES.MAPPING.find((v) => v.NAME === venueName)
      : undefined;
    return venue ? venue.LOCATIONS.includes(itemLoc) : false;
  }
  return selectedValue === itemLoc;
}

/**
 * Reconstruct the display label for a locations-dropdown value, e.g. when
 * restoring selections from the /loc/:locList URL.
 *
 * @param {string} value
 * @param {object} configData Parsed config.json.
 * @returns {string}
 */
export function labelForLocationValue(value, configData) {
  if (isVenueValue(value)) {
    return allVenueLabel(configData, venueNameFromValue(value));
  }
  return value;
}
