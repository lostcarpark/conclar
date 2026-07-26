import { useEffect, useRef } from "react";
import configData from "../config.json";

const FILTER_BEACON_URL = configData.ANALYTICS?.FILTER_BEACON_URL;
const INCLUDE_SESSION_TOKEN = configData.ANALYTICS?.INCLUDE_SESSION_TOKEN ?? false;
const DEBOUNCE_MS = configData.ANALYTICS?.DEBOUNCE_MS ?? 1000;

// Regenerated per page load, never persisted.
const sessionToken = INCLUDE_SESSION_TOKEN ? crypto.randomUUID() : undefined;

function sendBeacon({ search, selLoc, selTags, hideBefore }) {
  const payload = {
    search,
    locations: selLoc.map((option) => option.value),
    tags: Object.fromEntries(
      Object.entries(selTags).map(([type, selected]) => [
        type,
        selected.map((option) => option.value),
      ])
    ),
    hideBefore,
    ...(INCLUDE_SESSION_TOKEN && { session: sessionToken }),
  };
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const url = FILTER_BEACON_URL.replace("@filter_data", encoded);
  navigator.sendBeacon(url);
}

/**
 * Sends a debounced analytics beacon whenever the program filters settle.
 * No-op unless ANALYTICS.FILTER_BEACON_URL is set in config.json. Skips the
 * filter state present on the initial render, since that isn't a user
 * initiated change.
 * @param {object} filters Current filter selections (search, selLoc, selTags, hideBefore).
 */
export function useFilterAnalytics({ search, selLoc, selTags, hideBefore }) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!FILTER_BEACON_URL) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(
      () => sendBeacon({ search, selLoc, selTags, hideBefore }),
      DEBOUNCE_MS
    );
    return () => clearTimeout(timer);
  }, [search, selLoc, selTags, hideBefore]);
}
