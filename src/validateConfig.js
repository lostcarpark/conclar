/**
 * Validate config.json
 *
 * Runs at build / dev-server time (see vite.config.js), so an invalid
 * config.json fails the build rather than surfacing in the UI. Add further
 * config checks here as they arise; each check pushes messages onto the
 * shared errors array rather than throwing, so all problems are reported
 * in one pass.
 *
 * @param {object} configData Parsed contents of config.json.
 */
export function validateConfig(configData) {
  const errors = [];
  validateDataSourceConfig(configData, errors);
  validateVenuesConfig(configData, errors);
  if (errors.length > 0) {
    throw new Error(
      "Invalid config.json:\n - " + errors.join("\n - ")
    );
  }
}

/**
 * Validate that DATA_URLS and the legacy PROGRAM_DATA_URL/PEOPLE_DATA_URL
 * keys aren't ambiguously combined, and that DATA_URLS itself specifies
 * exactly one of COMBINED or the SCHEDULE+PEOPLE pair.
 *
 * @param {object} configData Parsed contents of config.json.
 * @param {string[]} errors Accumulator for problem descriptions.
 */
function validateDataSourceConfig(configData, errors) {
  const hasLegacyUrls =
    configData.PROGRAM_DATA_URL !== undefined ||
    configData.PEOPLE_DATA_URL !== undefined;
  const hasDataUrls = configData.DATA_URLS !== undefined;

  if (hasLegacyUrls && hasDataUrls) {
    errors.push(
      "config.json cannot specify both DATA_URLS and PROGRAM_DATA_URL/PEOPLE_DATA_URL."
    );
  }

  if (hasDataUrls) {
    const { COMBINED, SCHEDULE, PEOPLE } = configData.DATA_URLS;
    const hasCombined = COMBINED !== undefined;
    const hasSchedule = SCHEDULE !== undefined;
    const hasPeople = PEOPLE !== undefined;

    if (hasCombined && (hasSchedule || hasPeople)) {
      errors.push(
        "DATA_URLS cannot specify both COMBINED and SCHEDULE/PEOPLE."
      );
    }
    if (!hasCombined && hasSchedule !== hasPeople) {
      errors.push(
        "DATA_URLS must specify both SCHEDULE and PEOPLE, or COMBINED alone."
      );
    }
    if (!hasCombined && !hasSchedule && !hasPeople) {
      errors.push(
        "DATA_URLS must specify COMBINED, or both SCHEDULE and PEOPLE."
      );
    }
  }
}

/**
 * Validate the optional VENUES config block. Each venue must have a non-empty
 * NAME and a non-empty LOCATIONS array of strings. Venue names must be unique,
 * and a location may not be assigned to more than one venue.
 *
 * @param {object} configData Parsed contents of config.json.
 * @param {string[]} errors Accumulator for problem descriptions.
 */
function validateVenuesConfig(configData, errors) {
  if (configData.VENUES === undefined) return;

  if (!Array.isArray(configData.VENUES.MAPPING)) {
    errors.push("VENUES.MAPPING must be an array.");
    return;
  }

  const seenNames = new Set();
  const locationOwner = new Map();

  for (const [index, venue] of configData.VENUES.MAPPING.entries()) {
    if (typeof venue.NAME !== "string" || venue.NAME.length === 0) {
      errors.push(`VENUES.MAPPING[${index}] must have a non-empty NAME.`);
    } else if (seenNames.has(venue.NAME)) {
      errors.push(`VENUES.MAPPING contains duplicate NAME "${venue.NAME}".`);
    } else {
      seenNames.add(venue.NAME);
    }

    if (
      !Array.isArray(venue.LOCATIONS) ||
      venue.LOCATIONS.length === 0 ||
      !venue.LOCATIONS.every((loc) => typeof loc === "string" && loc.length > 0)
    ) {
      errors.push(
        `VENUES.MAPPING[${index}] must have a non-empty LOCATIONS array of strings.`
      );
      continue;
    }

    for (const loc of venue.LOCATIONS) {
      const owner = locationOwner.get(loc);
      if (owner !== undefined && owner !== venue.NAME) {
        errors.push(
          `Location "${loc}" is assigned to both "${owner}" and "${venue.NAME}" in VENUES.MAPPING.`
        );
      } else {
        locationOwner.set(loc, venue.NAME);
      }
    }
  }
}
