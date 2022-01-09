import React from "react";
import { useParams } from "react-router-dom";
import ProgramList from "./ProgramList";

const Person = ({ people, program, handler }) => {
  let params = useParams();
  let person = people.find((person) => person.id === params.id);
  let img = person.links.img ? <img src={person.links.img} alt={person.name} /> : "";
  return (
    <div className="person">
      <h2 className="person-name">Person: {person.name}</h2>
      <div className="person-image">{img}</div>
      <div
        className="person-bio"
        dangerouslySetInnerHTML={{ __html: person.bio }}
      />
      <ProgramList
        program={program.filter((item) => {
          //if (item.title.indexOf('Irish') !== -1) return true;
          if (item.people) {
            for (const person of item.people) {
              if (person.id === params.id) return true;
            }
          }
          return false;
        })}
        handler={handler}
      />
    </div>
  );
};

export default Person;
