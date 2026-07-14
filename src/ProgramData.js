import configData from "./config.json";
import { JsonParse } from "./utils/JsonParse";
import { Format } from "./utils/Format";
import { Temporal } from "@js-temporal/polyfill";
import { LocalTime } from "./utils/LocalTime";

//

/**
 * Class for processing program and people data.
 * At present this is just a class for grouping static functions, but it may evolve.
 */

export class ProgramData {
  static regex =
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d{3})?(Z)?([+-]\d{2}:\d{2})?/;

  /**
   * Hash of the given strings, joined with a separator very unlikely to
   * appear in real content (to avoid boundary-concatenation false matches).
   *
   * @param {string[]} parts
   * @returns {Promise<string>} Hex-encoded SHA-256 digest.
   */
  static async fingerprint(parts) {
    const bytes = new TextEncoder().encode(parts.join("\u0000"));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Process a program item and return the date and time as a ZonedDateTime.
   *
   * @param {object} item
   * @returns {Temporal.ZonedDateTime}
   */
  static processDateAndTime(item) {
    // If item doesn't have datetime property, construct from date and time properties.
    if (!item.hasOwnProperty("datetime")) {
      return Temporal.ZonedDateTime.from(
        item.date + "T" + item.time + "[" + configData.TIMEZONE + "]"
      );
    }

    // Apply regular expression to check if date includes timezone.
    const matches = item.datetime.match(this.regex);

    // If datetime does not evaluate, try using it with convention timezone.
    if (matches === null) {
      return Temporal.ZonedDateTime.from(
        item.datetime + "[" + configData.TIMEZONE + "]"
      );
    }

    // If time offset not included in datetime property, add convention timezone.
    if (matches[3] === undefined && matches[4] === undefined) {
      return Temporal.ZonedDateTime.from(
        item.datetime + "[" + configData.TIMEZONE + "]"
      );
    }

    // If datetime ends in Z, and no explicit offset, assume UTC.
    if (matches[3] === "Z" && matches[4] === undefined) {
      return Temporal.ZonedDateTime.from(matches[1] + "[+00:00]");
    }

    // Datetime with timezone offset.
    return Temporal.ZonedDateTime.from(matches[1] + "[" + matches[4] + "]");
  }

  /**
   * Read program and convert dates to ZonedDateTime, then sort by date.
   *
   * @param {array} program
   * @returns {array}
   */
  static processProgramData(program) {
    const utcTimeZone = "UTC";
    program.map((item) => {
      const startTime = this.processDateAndTime(item);
      item.startDateAndTime = startTime.withTimeZone(utcTimeZone);
      item.endDateAndTime = item.startDateAndTime.add({ minutes: item.mins ? item.mins : 0});
      item.timeSlot = LocalTime.getTimeSlot(item.startDateAndTime);
      // Which convention day the item belongs to. Precomputed because the
      // timezone-aware rounding is far too expensive to run per item per
      // render when grouping the programme into days.
      item.dayKey = item.startDateAndTime
        .withTimeZone(LocalTime.conventionTimeZone)
        .round({ smallestUnit: "day", roundingMode: "floor" })
        .toString();
      return item;
    });
    program.sort((a, b) => {
      return Temporal.ZonedDateTime.compare(a.startDateAndTime, b.startDateAndTime);
    });
    //console.log("Program data", program);
    return program;
  }

  /**
   * Loop through people and normalize properties.
   *
   * @param {array} people
   * @returns {array}
   */
  static processPeopleData(people) {
    for (let person of people) {
      // If SortName not in file, create from name. If name is array, put last element first for sorting.
      if (!person.sortname || person.sortname.trim().length === 0) {
        person.sortname = Array.isArray(person.name)
          ? [...person.name].reverse().join(" ")
          : person.name;
      }
      // If name is an array, convert to single string.
      if (Array.isArray(person.name)) person.name = person.name.join(" ");
      // Several possible picture fields, so provide one.
      person.img =
        (person.links && (person.links.img || person.links.photo)) ||
        person.image_256_url ||
        null;
      // Hoping to use in future for nicer URLs of form "/person/name". However caused problems with unicode chars, so using ID for now.
      person.uri = encodeURIComponent(person.name.replace(/[ ]/g, "_"));
    }
    people.sort((a, b) => a.sortname.localeCompare(b.sortname));
    return people;
  }

  /**
   * After loading program and people, add additional person data to program items.
   *
   * @param {array} program
   * @param {array} people
   */
  static addProgramParticipantDetails(program, people) {
    const peopleById = new Map(people.map((person) => [person.id, person]));
    // Add extra participant info to program participants.
    for (let item of program) {
      if (item.people) {
        // Loop through people backwards, so we don't miss anyone if entries are removed.
        for (let index = item.people.length - 1; index >= 0; index--) {
          let fullPerson = peopleById.get(item.people[index].id);
          if (!fullPerson) {
            item.people.splice(index, 1);
          }
          //Moderator check before nuking the item person data.
          if (
            item.people.length > 0 &&
            typeof(item.people[index]) !== 'undefined' &&
            ((item.people[index].hasOwnProperty("name") &&
              item.people[index].name.indexOf("(moderator)") > 0) ||
            (item.people[index].hasOwnProperty("role") &&
              item.people[index].role === "moderator"))
          )
            item.moderator = item.people[index].id;
          if (fullPerson) {
            // Replace partial person with full person reference.
            item.people[index] = fullPerson;
          }
        }
        item.people.sort((a, b) => a.sortname.localeCompare(b.sortname));
      }
    }
  }

  /**
   * Extract locations from program.
   *
   * @param {array} program
   * @returns {array}
   */
  static processLocations(program) {
    const locations = [];
    for (const item of program) {
      // Check item has at least one location.
      if (item.loc && Array.isArray(item.loc) && item.loc.length) {
        for (const loc of item.loc) {
          // If location doesn't exist in locations array, add it.
          if (
            !locations.find((entry) => {
              return loc === entry.value;
            })
          ) {
            locations.push({ value: loc, label: loc });
          }
        }
      }
    }
    // Now sort the locations.
    locations.sort((a, b) => a.value.localeCompare(b.value));
    return locations;
  }

  /**
   * Grenadine does not have a mode to put types ("format") into the tags like Zambia does.
   *
   * @param {array} program
   * @returns {array}
   */
  static reformatAsTag(program) {
    for (let item of program) {
      if (item.format && item.hasOwnProperty("tags"))
        item.tags.push("type:" + item.format);
    }
    return program;
  }

  /**
   * TAG should include an appropriate prefix if using them.
   *
   * @param {array} program
   * @returns {array}
   */
  static tagLinks(program) {
    const linksToTag = configData.LINKS.filter((link) => link.TAG.length > 0);
    for (const linkToTag of linksToTag) {
      for (const item of program) {
        if (
          item.hasOwnProperty("links") &&
          // handle null links property
          item.links &&
          item.links.hasOwnProperty(linkToTag.NAME)
        ) {
          item.tags.push(linkToTag.TAG);
        }
      }
    }
    return program;
  }

  /**
   * Extract tags from program or participants.
   *
   * @param {array} taggedItems The program or participant data to extract tags from.
   * @param {object} tagConfig The config section to use.
   * @returns {array}
   */
  static processTags(taggedItems, tagConfig) {
    //Pre-parse grenadine Format as konopas Type.

    // Tags is an object with a property for each tag type. Default to a property for general tags, and one for an index of all tags.
    const tags = { tags: [], all: {} };

    /**
     * Subfunction to push tag to tag list.
     * @param {array} tagList The tag array to add tag to if not already present.
     * @param {object} tag The tag object to add.
     * @returns {object} The tag object added.
     */
    function addTag(tagList, tag) {
      // If item doesn't exist in tags array, add it.
      if (
        !tagList.find((entry) => {
          return tag.value === entry.value;
        })
      ) {
        tagList.push(tag);
      }
      return tag;
    }

    /**
     * Takes a tag string and decodes into a tag object. Adds to tags.all array.
     * @param {*} tag
     * @returns
     */
    function decodeTag(tag) {
      const hasProps = tag.hasOwnProperty("value");
      const value = hasProps ? tag.value : tag;
      // If tag already indexed, use that.
      if (tags.all.hasOwnProperty(value)) return tags.all[value];
      const newTag = { value: value };
      // If tag has properties, apply label and category to stored tag if present.
      if (hasProps) {
        if (tag.hasOwnProperty("label")) newTag.label = tag.label;
        if (tag.hasOwnProperty("category")) newTag.category = tag.category;
        tags.all[value] = newTag;
        return newTag;
      }
      // If we get here, it's an old style tag.
      const matches = tag.match(/^(.+):(.+)/);
      if (matches && matches.length === 3) {
        const prefix = matches[1];
        const label = matches[2];
        // Tag has a prefix. Check if it's one we're interested in.
        if (prefix in tags) {
          newTag.category = prefix;
          newTag.label = Format.formatTag(label);
        } else {
          newTag.label = tag;
        }
      } else {
        newTag.label = tag;
      }
      tags.all[value] = newTag;
      return newTag;
    }

    // For each tag prefix we want to separate, add a property.
    if (tagConfig.hasOwnProperty("SEPARATE")) {
      for (const tag of tagConfig.SEPARATE) {
        tags[tag.PREFIX] = [];
      }
    }
    for (const item of taggedItems) {
      // Check item has at least one tag.
      if (item.tags && Array.isArray(item.tags) && item.tags.length) {
        item.tags.forEach((tag, index) => {
          item.tags[index] = decodeTag(tag);
        });
      }
    }
    // Now we've got tags in tags.all array, split them into categories.
    for (const value in tags.all) {
      const tag = tags.all[value];
      if (tag.hasOwnProperty("category")) {
        // If category has own drop-down, add to that drop-down.
        if (tags.hasOwnProperty(tag.category)) {
          tags[tag.category].push(tag);
        } else {
          tags.tags.push(tag);
        }
      } else {
        // Otherwise add to generic tags.
        tags.tags.push(tag);
      }
    }

    // Now sort each set of tags.
    for (const tagList in tags) {
      if (Array.isArray(tags[tagList]))
        tags[tagList].sort((a, b) => a.label.localeCompare(b.label));
    }

    // If generating day tags, loop through days and add a tag for day in convention timezone.
    if (tagConfig.hasOwnProperty("DAY_TAG") && tagConfig.DAY_TAG.GENERATE) {
      tags.days = [];
      for (const item of taggedItems) {
        // Get the day of the program (this shouldn't apply for participants) item.
        const dayValue = LocalTime.formatISODateInConventionTimeZone(
          item.startDateAndTime
        );
        const dayTag = tags.days.includes(dayValue)
          ? tags.days[dayValue]
          : addTag(tags.days, {
              value: dayValue,
              label: LocalTime.formatDayNameInConventionTimeZone(
                item.startDateAndTime
              ),
              category: "days",
            });
        if (!tags.all.hasOwnProperty(dayValue)) {
          tags.all[dayValue] = dayTag;
        }
        item.tags.push(dayTag);
      }
      // Sort days by value.
      tags.days.sort((a, b) => a.value.localeCompare(b.value));
    }

    //console.log(tags);
    return tags;
  }

  /**
   * Process data from program and people.
   *
   * @param {array} progData
   * @param {array} pplData
   * @returns {object}
   */
  static processData(progData, pplData) {
    let program = this.processProgramData(progData);
    if (configData.TAGS.FORMAT_AS_TAG) program = this.reformatAsTag(program);
    if (
      configData.LINKS &&
      configData.LINKS.filter((link) => link.TAG.length > 0).length > 0
    )
      program = this.tagLinks(program);
    const people = this.processPeopleData(pplData);
    this.addProgramParticipantDetails(program, people);
    const locations = this.processLocations(program);
    const tags = this.processTags(program, configData.TAGS);
    const personTags = this.processTags(people, configData.PEOPLE.TAGS);
    LocalTime.checkTimeZonesDiffer(program);

    //setLoadingMessage("Processing Complete... Rendering...")
    return {
      program: program,
      people: people,
      locations: locations,
      tags: tags,
      personTags: personTags,
    };
  }

  /**
   * Fetch Text from URL.
   *
   * @param {string} url
   * @returns {object}
   */
  static async fetchText(url, fetchOptions) {
    const res = await fetch(url, fetchOptions);
    const text = await res.text();
    return text;
  }

  /**
   * Parse a fetched DATA_URLS source. The file self-describes its shape via
   * a required top-level schemaVersion; a combined file has both "schedule"
   * and "people" properties, while a single-purpose file has just one.
   *
   * @param {string} raw Raw text of the source.
   * @param {string} label Source label (e.g. "data", "schedule", "people") for the log line.
   * @returns {{program: (array|undefined), people: (array|undefined)}}
   */
  static parseSchemaVersionedData(raw, label) {
    const parsed = JSON.parse(raw);
    switch (parsed.schemaVersion) {
      case 2: {
        if (parsed.hasOwnProperty("info")) {
          console.log(`Fetched ${label}:`, parsed.info);
        }
        return { program: parsed.schedule, people: parsed.people };
      }
      default:
        throw new Error("Unknown schema version: " + parsed.schemaVersion);
    }
  }

  /**
   * Fetch and parse program, people, and info.
   *
   * Throws on fetch or parse errors; the caller is responsible for surfacing
   * the failure to the user. Data-source configuration is validated at build
   * time (see vite.config.js), so config.json is assumed valid here.
   *
   * @param {boolean} firstTime
   * @param {string} [previousFingerprint] Fingerprint of the previously
   *   fetched payload (see fingerprint()).
   * @returns {{fingerprint: string, data: object|null}} `data` is null when
   *   the fetched payload is unchanged from the previous fetch.
   */
  static async fetchData(firstTime, previousFingerprint) {
    console.log("Fetching:", firstTime ? "First time" : "Refreshing");
    const fetchOptions = firstTime
      ? configData.FETCH_OPTIONS_FIRST
      : configData.FETCH_OPTIONS;

    let program, people, info, rawParts;
    if (configData.DATA_URLS) {
      const { COMBINED, SCHEDULE, PEOPLE } = configData.DATA_URLS;
      if (COMBINED) {
        let raw;
        [raw, info] = await Promise.all([
          this.fetchText(COMBINED, fetchOptions),
          this.fetchText(configData.INFORMATION.MARKDOWN_URL, fetchOptions),
        ]);
        rawParts = [raw, info];
        ({ program, people } = this.parseSchemaVersionedData(raw, "data"));
      } else {
        let rawSchedule, rawPeople;
        [rawSchedule, rawPeople, info] = await Promise.all([
          this.fetchText(SCHEDULE, fetchOptions),
          this.fetchText(PEOPLE, fetchOptions),
          this.fetchText(configData.INFORMATION.MARKDOWN_URL, fetchOptions),
        ]);
        rawParts = [rawSchedule, rawPeople, info];
        program = this.parseSchemaVersionedData(rawSchedule, "schedule").program;
        people = this.parseSchemaVersionedData(rawPeople, "people").people;
      }
    } else {
      // Legacy path: always the v1 bare-array format.
      if (configData.PROGRAM_DATA_URL === configData.PEOPLE_DATA_URL) {
        let raw;
        [raw, info] = await Promise.all([
          this.fetchText(configData.PROGRAM_DATA_URL, fetchOptions),
          this.fetchText(configData.INFORMATION.MARKDOWN_URL, fetchOptions),
        ]);
        rawParts = [raw, info];
        [program, people] = JsonParse.extractJson(raw);
      } else {
        let rawProgram, rawPeople;
        [rawProgram, rawPeople, info] = await Promise.all([
          this.fetchText(configData.PROGRAM_DATA_URL, fetchOptions),
          this.fetchText(configData.PEOPLE_DATA_URL, fetchOptions),
          this.fetchText(configData.INFORMATION.MARKDOWN_URL, fetchOptions),
        ]);
        rawParts = [rawProgram, rawPeople, info];
        program = JsonParse.extractJson(rawProgram)[0];
        people = JsonParse.extractJson(rawPeople)[0];
      }
    }

    // A background refresh commonly comes back byte-identical to what's
    // already loaded. Returning early keeps the previously processed arrays
    // (and their references) in place, so reprocessing and downstream
    // re-rendering are skipped for data that hasn't actually changed.
    const fingerprint = await ProgramData.fingerprint(rawParts);
    if (fingerprint === previousFingerprint) {
      return { fingerprint, data: null };
    }

    const data = ProgramData.processData(program, people);
    data.info = info;
    return { fingerprint, data };
  }
}
