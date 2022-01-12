import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import configData from "./config.json";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import FilterableProgram from "./components/FilterableProgram";
import ProgramList from "./components/ProgramList";
import People from "./components/People";
import Person from "./components/Person";
import Info from "./components/Info";
import "./App.css";
import { ProgramSelection } from "./ProgramSelection";
import { JsonParse } from "./utils/JsonParse";
import { Format } from "./utils/Format";

export class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      program: [],
      people: [],
      locations: [],
      tags: [],
      mySchedule: [],
      dataIsLoaded: false,
    };
    this.programUpdateHandler = this.programUpdateHandler.bind(this);
  }

  processProgramData(program) {
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
  processPeopleData(people) {
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
  addProgramParticipantDetails(program, people) {
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
  processLocations(program) {
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
  processTags(program) {
    const tags = [];
    for (const item of program) {
      // Check item has at least one tag.
      if (item.tags && Array.isArray(item.tags) && item.tags.length) {
        for (const tag of item.tags) {
          // If location doesn't exist in tags array, add it.
          if (
            !tags.find((entry) => {
              return tag === entry.value;
            })
          ) {
            tags.push({ value: tag, label: Format.formatTag(tag) });
          }
        }
      }
    }
    // Now sort the locations.
    tags.sort((a, b) => {
      if (a.label > b.label) return 1;
      if (a.label < b.label) return -1;
      return 0;
    });
    return tags;
  }

  processMySchedule(program) {
    let selectedItems = ProgramSelection.getAllSelections();
    let mySchedule = program.filter((item) => {
      if (selectedItems && selectedItems[item.id])
        return selectedItems[item.id];
      return false;
    });
    return mySchedule;
  }

  programUpdateHandler() {
    let currentState = this.state;
    let mySchedule = this.processMySchedule(currentState.program);
    currentState.mySchedule = mySchedule;
    this.setState({ currentState });
  }

  // Process data from program and people.
  processData(progData, pplData = null) {
    if (pplData === null) {
      pplData = progData;
    }
    let program = this.processProgramData(progData);
    let people = this.processPeopleData(pplData);
    this.addProgramParticipantDetails(program, people);
    let locations = this.processLocations(program);
    let tags = this.processTags(program);
    let mySchedule = this.processMySchedule(program);
    localStorage.setItem("program", JSON.stringify(program));
    localStorage.setItem("people", JSON.stringify(people));
    this.setState({
      program: program,
      people: people,
      locations: locations,
      tags: tags,
      mySchedule: mySchedule,
      dataIsLoaded: true,
    });
  }

  componentDidMount() {
    // If only one data source, we can use a single fetch.
    if (configData.PROGRAM_DATA_URL === configData.PEOPLE_DATA_URL) {
      fetch(configData.PROGRAM_DATA_URL)
        .then((res) => res.text())
        .then((data) => {
          const entities = JsonParse.extractJson(data);
          this.processData(entities[0], entities[1]);
        });
    } else {
      // Separate program and people sources, so need to create promise for each fetch.
      let progPromise = fetch(configData.PROGRAM_DATA_URL).then((res) =>
        res.text()
      );
      let pplPromise = fetch(configData.PEOPLE_DATA_URL).then((res) =>
        res.text()
      );
      Promise.all([progPromise, pplPromise]).then((data) => {
        let program = JsonParse.extractJson(data[0])[0];
        let people = JsonParse.extractJson(data[1])[0];
        // Called with an array containing result of each promise.
        this.processData(program, people);
      });
    }
  }

  render() {
    const { program, people, locations, tags, mySchedule, dataIsLoaded } =
      this.state;

    const offset = Format.getTimeZoneOffset();

    if (!dataIsLoaded)
      return (
        <div>
          <h1>Program data loading...</h1>
        </div>
      );
    return (
      <Router>
        <div className="App">
          <Header title={configData.APP_TITLE} />
          <Navigation />

          <Routes>
            <Route path="/">
              <Route
                index
                element={
                  <FilterableProgram
                    program={program}
                    locations={locations}
                    tags={tags}
                    offset={offset}
                    handler={this.programUpdateHandler}
                  />
                }
              />
              <Route path="people">
                <Route index element={<People people={people} />} />
                <Route
                  path=":id"
                  element={
                    <Person
                      people={people}
                      program={program}
                      offset={offset}
                      handler={this.programUpdateHandler}
                    />
                  }
                />
              </Route>
              <Route
                path="myschedule"
                element={
                  <ProgramList
                    program={mySchedule}
                    offset={offset}
                    handler={this.programUpdateHandler}
                  />
                }
              />
              <Route path="info" element={<Info />} />
            </Route>
          </Routes>
        </div>
      </Router>
    );
  }
}

export default App;
