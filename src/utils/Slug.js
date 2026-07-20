export function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Person ids are full UUIDs. The first 8 hex characters (the UUID's first
// dash-delimited segment) give ~4.3 billion possible values, which is more
// than enough to keep collisions vanishingly unlikely for a con's people
// list, while making URLs much shorter to read/share/type.
const SHORT_ID_LENGTH = 8;

export function shortId(id) {
  return id.replace(/-/g, "").slice(0, SHORT_ID_LENGTH);
}

// Resolves a (possibly truncated) id from a URL back to a person, matching
// on the short id so both full-UUID and shortened links keep working. In the
// rare case that two people share the same short id, the name slug is used
// as a tiebreaker, since two different people are exceedingly unlikely to
// also share a slugified name.
export function findPersonByShortId(people, id, slug) {
  const normalized = id.replace(/-/g, "").toLowerCase();
  const matches = people.filter((person) =>
    person.id.replace(/-/g, "").toLowerCase().startsWith(normalized)
  );
  if (matches.length <= 1) return matches[0];
  return (
    matches.find((person) => slugify(person.name) === slug) ?? matches[0]
  );
}
