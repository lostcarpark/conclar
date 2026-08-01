import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStoreState } from "easy-peasy";
import { useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { MdOutlineArrowBackIos } from "react-icons/md";
import PersonLinks from "./PersonLinks";
import ProgramList from "./ProgramList";
import Tag from "./Tag";
import configData from "../config.json";
import { useProgramTime } from "../hooks/useProgramTime";
import { slugify, shortId, findPersonByShortId } from "../utils/Slug";

const Person = () => {
  const navigate = useNavigate();
  const program = useStoreState((state) => state.program);
  const people = useStoreState((state) => state.people);
  const params = useParams();
  const programTime = useProgramTime();
  const person = findPersonByShortId(people, params.id, params.slug);

  // Keep the URL's short id and name slug in sync with the person's actual
  // data, so old bookmarked/shared links (full-UUID links from before, or a
  // renamed participant) still land on a canonical, shareable URL.
  useEffect(() => {
    if (!person) return;
    const correctId = shortId(person.id);
    const correctSlug = slugify(person.name);
    if (params.id !== correctId || params.slug !== correctSlug) {
      navigate(`/people/${correctId}/${correctSlug}`, { replace: true });
    }
  }, [navigate, person, params.id, params.slug]);

  useEffect(() => {
    if (!person) return;
    document.title = `${person.name} - ${configData.APP_TITLE}`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        `${person.name}'s schedule at ${configData.APP_TITLE}`
      );
    }
  }, [person]);

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
      for (const itemPerson of item.people) {
        if (itemPerson.id === person.id) return true;
      }
    }
    return false;
  });

  const getPersonTags = (person) => {
    if (!person.hasOwnProperty("tags") || person.tags.length === 0) return "";
    const tags = [];
    for (const tag of person.tags) {
      tags.push(<Tag key={tag.value} tag={tag} />);
    }
    return <div className="person-tags">{tags}</div>;
  };

  return (
    <div className="person">
      <h2 className="person-name">
        <button className="person-back-button" onClick={() => navigate(-1)}>
          <MdOutlineArrowBackIos />
        </button>{" "}
        <span className="person-title">{configData.PEOPLE.PERSON_HEADER}</span>
        {person.name}
      </h2>
      {getPersonTags(person)}
      <div className="person-image">{img}</div>
      <div
        className="person-bio"
        dangerouslySetInnerHTML={{ __html: safeBio }}
      />
      <PersonLinks person={person} />
      <ProgramList program={filteredProgram} programTime={programTime} />
    </div>
  );
};

export default Person;
