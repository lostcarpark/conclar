import configData from "./config.json";
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
      person.uri = encodeURIComponent(person.name.replace(/[ ]/g, "_"));
    }
    people.sort((a, b) => {
      if (a.sortname < b.sortname) return -1;
      if (a.sortname > b.sortname) return 1;
      return 0;
    });
    return people;
  }

  // After loading program and people, add additional person data to program items.
  static addProgramParticipantDetails(program, people) {
    // Add extra participant info to program participants.
    program.forEach((item) => {
      if (item.people) {
        item.people.forEach((person) => {
          let fullPerson = people.find(
            (fullPerson) => fullPerson.id === person.id
          );
          if (fullPerson) {
            person.uri = fullPerson.uri;
            person.links = fullPerson.links;
            person.sortName = fullPerson.sortName;
            person.image_256_url = fullPerson.image_256_url;
          }
        });
        item.people.sort((a, b) => {
          if (a.sortname < b.sortname) return -1;
          if (a.sortname > b.sortname) return 1;
          return 0;
        });
      }
    });
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
    locations.sort((a, b) => {
      if (a.value > b.value) return 1;
      if (a.value < b.value) return -1;
      return 0;
    });
    return locations;
  }

  // Extract tags from program.
  static processTags(program) {
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
      tags[tagList].sort((a, b) => {
        if (a.label > b.label) return 1;
        if (a.label < b.label) return -1;
        return 0;
      });
    }
    return tags;
  }

  // Process data from program and people.
  static processData(progData, pplData) {
    const program = this.processProgramData(progData);
    const people = this.processPeopleData(pplData);
    this.addProgramParticipantDetails(program, people);
    const locations = this.processLocations(program);
    const tags = this.processTags(program);
    localStorage.setItem("program", JSON.stringify(program));
    localStorage.setItem("people", JSON.stringify(people));

    return {
      program: program,
      people: people,
      locations: locations,
      tags: tags,
    };
  }
}
