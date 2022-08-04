import React from "react";
import { useStoreState } from "easy-peasy";
import { useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import PersonLinks from "./PersonLinks";
import ProgramList from "./ProgramList";
import configData from "../config.json";

const Person = () => {
  const program = useStoreState((state) => state.program);
  const people = useStoreState((state) => state.people);
  const params = useParams();
  const person = people.find((person) => person.id.toString() === params.id);
  if (!person)
    return (
      <div className="error">
        Person id <span>{params.id}</span> was not found.
      </div>
    );
  const img = person.img ? <img src={person.img} alt={person.name} /> : "";
  // Sanitize the bio to remove dangerous HTML, using options from config.
  const safeBio = person.bio
    ? DOMPurify.sanitize(person.bio, configData.PEOPLE.BIO.PURIFY_OPTIONS)
    : "";
  const filteredProgram = program.filter((item) => {
    if (item.people) {
      // IF item has people, check eash one to see if they match the person we're interested in.
      for (const person of item.people) {
        if (person.id.toString() === params.id) return true;
      }
    }
    return false;
  });
  return (
    <div className="person">
      <h2 className="person-name">
        <span className="person-title">{configData.PEOPLE.PERSON_HEADER}</span>
        {person.name}
      </h2>
      <div className="person-image">{img}</div>
      <div
        className="person-bio"
        dangerouslySetInnerHTML={{ __html: safeBio }}
      />
      <PersonLinks person={person} />
      <ProgramList program={filteredProgram} />
    </div>
  );
};

export default Person;
