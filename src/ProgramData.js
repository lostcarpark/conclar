import configData from "./config.json";
import { JsonParse } from "./utils/JsonParse";
import { Format } from "./utils/Format";

// Creating class for processing program and people data.
// At present this is just a class for grouping static functions, but it may evolve.

export class ProgramData {
  static processProgramData(program) {
    program.sort((a, b) => {
      // First compare the dates.
      if (a.date < b.date) return -1;
      if (a.date > b.date) return +1;
      // If we get here, date is the same, so check time.
      if (a.time < b.time) return -1;
      if (a.time > b.time) return +1;
      // Finally, items are the same time and date, so treat as equal (we may add stream later).
      return 0;
    });
    return program;
  }

  // Process
  static processPeopleData(people) {
    for (let person of people) {
      // If SortName not in file, create from name. If name is array, put last element first for sorting.
      if (!person.sortname) {
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

  // After loading program and people, add additional person data to program items.
  static addProgramParticipantDetails(program, people) {
    // Add extra participant info to program participants.
    for (let item of program) {
      if (item.people) {
        for (let index = 0; index < item.people.length; index++) {
          let fullPerson = people.find(
            (fullPerson) => fullPerson.id === item.people[index].id
          );
          //Moderator check before nuking the item person data.
          if (item.people[index].name.indexOf("(moderator)") > 0 || 
              (item.people[index].hasOwnProperty("role") && item.people[index].role === "Moderator"))
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

  // Extract locations from program.
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

  static reformatAsTag(program) {
    //Grenadine does not have a mode to put types ("format") into the tags like Zambia does.
    for (let item of program) {
      if (item.format && item.hasOwnProperty("tags"))
        item.tags.push("type:" + item.format);
    }
    return program;
  }

  // Extract tags from program.
  static processTags(program) {
    //Pre-parse grenadine Format as konopas Type.

    // Tags is an object with a property for each tag type. Default to one property for general tags.
    const tags = { tags: [] };

    // Subfunction to push tag to tag list.
    function addTag(tagList, value, label) {
      // If item doesn't exist in tags array, add it.
      if (
        !tagList.find((entry) => {
          return value === entry.value;
        })
      ) {
        tagList.push({ value: value, label: label });
      }
    }

    // For each tag prefix we want to separate, add a property.
    if ("SEPARATE" in configData.TAGS) {
      for (const tag of configData.TAGS.SEPARATE) {
        tags[tag.PREFIX] = [];
      }
    }
    for (const item of program) {
      // Check item has at least one tag.
      if (item.tags && Array.isArray(item.tags) && item.tags.length) {
        for (const tag of item.tags) {
          let matches = tag.match(/^(.+):(.+)/);
          if (matches && matches.length === 3) {
            const prefix = matches[1];
            const label = matches[2];
            // Tag has a prefix. Check if it's one we're interested in.
            if (prefix in tags) {
              addTag(tags[prefix], tag, label);
            } else {
              addTag(tags.tags, tag, Format.formatTag(tag));
            }
          } else {
            // Tag does not have a prefix, so add to default tags list.
            addTag(tags.tags, tag, tag);
          }
        }
      }
    }
    // Now sort each set of tags.
    for (let tagList in tags) {
      tags[tagList].sort((a, b) => a.label.localeCompare(b.label));
    }
    return tags;
  }

  // Process data from program and people.
  static processData(progData, pplData) {
    let program = this.processProgramData(progData);
    if (configData.TAGS.FORMAT_AS_TAG) program = this.reformatAsTag(program);
    const people = this.processPeopleData(pplData);
    this.addProgramParticipantDetails(program, people);
    const locations = this.processLocations(program);
    const tags = this.processTags(program);

    return {
      program: program,
      people: people,
      locations: locations,
      tags: tags,
    };
  }

  static async fetchUrl(url) {
    const res = await fetch(url, { cache: "reload" });
    const data = await res.text();
    return JsonParse.extractJson(data);
  }

  static async fetchData() {
    try {
      // If only one data source, we can use a single fetch.
      if (configData.PROGRAM_DATA_URL === configData.PEOPLE_DATA_URL) {
        const [rawProgram, rawPeople] = await this.fetchUrl(
          configData.PROGRAM_DATA_URL
        );
        return ProgramData.processData(rawProgram, rawPeople);
      } else {
        // Separate program and people sources, so need to create promise for each fetch.
        const [[rawProgram], [rawPeople]] = await Promise.all([
          this.fetchUrl(configData.PROGRAM_DATA_URL),
          this.fetchUrl(configData.PEOPLE_DATA_URL),
        ]);
        // Called with an array containing result of each promise.
        return ProgramData.processData(rawProgram, rawPeople);
      }
    } catch (e) {
      console.log("Fetch error", e);
    }
  }
}
