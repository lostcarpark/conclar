import { createEvent, createEvents } from "ics";
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

function appPrefix() {
  return slugify(configData.APP_ID) || "conclar";
}

function filenameFor(item) {
  const title = slugify(item.title) || item.id;
  return appPrefix() + "-" + title + ".ics";
}

function describeItem(item) {
  const parts = [];
  if (item.desc) {
    parts.push(item.desc);
  }
  if (item.people && item.people.length > 0) {
    parts.push(item.people.map((person) => person.name.toString()).join(", "));
  }
  if (parts.length === 0) {
    return undefined;
  }
  return new DOMParser().parseFromString(parts.join("\n\n"), "text/html").body
    .textContent;
}

/**
 * Whether items offer a download to add them to a calendar app.
 *
 * @returns {boolean}
 */
export function calendarLinkEnabled() {
  return !!(configData.CALENDARLINK?.SHOW && configData.INTERACTIVE);
}

const PRODUCT_ID = "-//ConClar//ConClar//EN";

function itemUrl(item) {
  if (!configData.PERMALINK?.SHOW_PERMALINK || !configData.INTERACTIVE) {
    return undefined;
  }
  return window.location.origin + window.publicUrl + "id/" + item.id;
}

function eventFor(item) {
  return {
    uid: configData.APP_ID + "-" + item.id + "@" + window.location.hostname,
    start: toDateArray(item.startDateAndTime),
    startInputType: "utc",
    end: toDateArray(item.endDateAndTime),
    endInputType: "utc",
    title: item.title,
    description: describeItem(item),
    location: item.loc ? String(item.loc) : undefined,
    url: itemUrl(item),
  };
}

/**
 * Trigger a browser download of ICS content as a file, via a Blob and a
 * temporary object URL. More reliable across browsers (notably Safari)
 * than a `data:` URL with a `download` attribute.
 */
function downloadFile(content, filename) {
  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function downloadItemIcs(item) {
  const { error, value } = createEvent({
    ...eventFor(item),
    productId: PRODUCT_ID,
  });
  if (error) {
    throw error;
  }
  downloadFile(value, filenameFor(item));
}

/**
 * Download several items as a single calendar. `calendar.name` is used by
 * calendar apps that offer to import into a new calendar; `calendar.fileSuffix`
 * goes into the filename after the app prefix, so must already be a slug.
 */
export function downloadListIcs(items, calendar) {
  const { error, value } = createEvents(items.map(eventFor), {
    productId: PRODUCT_ID,
    calName: calendar.name,
  });
  if (error) {
    throw error;
  }
  downloadFile(value, appPrefix() + "-" + calendar.fileSuffix + ".ics");
}
