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

export class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      program: [],
      people: [],
      mySchedule: [],
      dataIsLoaded: false,
    };
    this.programUpdateHandler = this.programUpdateHandler.bind(this);
  }

  processProgramData(data) {
    // Regular expression to find program data.
    let matches = data.match(/program = ([^\n]*);/);
    let program = JSON.parse(matches[1]).sort((a, b) => {
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
  processPeopleData(data) {
    // Regular expression to find people.
    let matches = data.match(/people = ([^\n]*);/);
    let people = JSON.parse(matches[1]).sort((a, b) => {
      if (a.name[0] < b.name[0]) return -1;
      if (a.name[0] > b.name[0]) return 1;
      return 0;
    });
    people.forEach((person) => {
      person.uri = encodeURIComponent(person.name[0].replace(/[ ]/g, "_"));
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
          person.uri = fullPerson.uri;
          person.links = fullPerson.links;
        });
      }
    });
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

  componentDidMount() {
    console.log(configData.PROGRAM_DATA_URL)
    fetch(configData.PROGRAM_DATA_URL)
      .then((res) => res.text())
      .then((data) => {
        let program = this.processProgramData(data);
        let people = this.processPeopleData(data);
        this.addProgramParticipantDetails(program, people);
        let mySchedule = this.processMySchedule(program);
        console.log(mySchedule);
        localStorage.setItem("program", JSON.stringify(program));
        localStorage.setItem("people", JSON.stringify(people));
        this.setState({
          program: program,
          people: people,
          mySchedule: mySchedule,
          dataIsLoaded: true,
        });
      });
  }

  render() {
    const { program, people, mySchedule, dataIsLoaded } = this.state;

    if (!dataIsLoaded)
      return (
        <div>
          <h1>Program data loading...</h1>
        </div>
      );
    return (
      <Router>
        <div className="App">
          <Header title={ configData.APP_TITLE } />
          <Navigation />

          <Routes>
            <Route path="/">
              <Route
                index
                element={
                  <FilterableProgram
                    program={program}
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
