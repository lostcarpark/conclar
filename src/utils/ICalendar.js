import { createEvent } from "ics";
import configData from "../config.json";

const MAX_SLUG_LENGTH = 60;

function toDateArray(zonedDateTime) {
  const utc = zonedDateTime.withTimeZone("UTC");
  return [utc.year, utc.month, utc.day, utc.hour, utc.minute];
}

function slugify(text) {
  const slug = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length <= MAX_SLUG_LENGTH
    ? slug
    : slug.slice(0, MAX_SLUG_LENGTH).replace(/-[^-]*$/, "");
}

function filenameFor(item) {
  const prefix = slugify(configData.APP_ID) || "conclar";
  const title = slugify(item.title) || item.id;
  return prefix + "-" + title + ".ics";
}

function describeItem(item) {
  let desc = item.desc;
  if (item.people && item.people.length > 0) {
    const names = item.people.map((person) => person.name.toString());
    desc = "\n\n" + names.join(", ");
  }
  return new DOMParser().parseFromString(desc, "text/html").body.textContent;
}

function buildIcsContent(item) {
  const { error, value } = createEvent({
    uid: configData.APP_ID + "-" + item.id + "@" + window.location.hostname,
    productId: "-//ConClar//ConClar//EN",
    start: toDateArray(item.startDateAndTime),
    startInputType: "utc",
    end: toDateArray(item.endDateAndTime),
    endInputType: "utc",
    title: item.title,
    description: item.desc ? describeItem(item) : undefined,
    location: item.loc ? String(item.loc) : undefined,
  });

  if (error) throw error;
  return value;
}

/**
 * Trigger a browser download of an ICS event as a file, via a Blob and a
 * temporary object URL. More reliable across browsers (notably Safari)
 * than a `data:` URL with a `download` attribute.
 */
export function downloadIcs(item) {
  const blob = new Blob([buildIcsContent(item)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filenameFor(item);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
