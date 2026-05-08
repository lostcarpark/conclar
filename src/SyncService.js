import configData from "./config.json";

const syncConfig = configData.SYNC || {};

function getApiUrl() {
  return syncConfig.API_URL || "";
}

function getAppId() {
  return configData.APP_ID || "";
}

function getSelectionsUrl() {
  const appId = getAppId();
  if (!appId) {
    throw new Error("Missing APP_ID in config");
  }
  return `${getApiUrl()}/apps/${encodeURIComponent(appId)}/selections`;
}

function resolveReturnUrl(urlTemplate) {
  return urlTemplate.replace(
    "<return_url>",
    encodeURIComponent(window.location.href)
  );
}

export async function fetchProfile() {
  const response = await fetch(`${getApiUrl()}/profile`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Profile fetch failed: ${response.status}`);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Profile response was not valid JSON");
  }
  if (typeof data !== "object" || data === null || (!data.login_url && !data.authenticated)) {
    throw new Error("Profile response has unexpected shape");
  }
  if (data.authenticated && (!data.id || !data.display_name)) {
    throw new Error("Authenticated profile missing required fields");
  }
  if (data.login_url) {
    data.login_url = resolveReturnUrl(data.login_url);
  }
  if (data.logout_url) {
    data.logout_url = resolveReturnUrl(data.logout_url);
  }
  return data;
}

export async function fetchSelections() {
  const response = await fetch(getSelectionsUrl(), {
    credentials: "include",
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Selections fetch failed: ${response.status}`);
  }
  const data = await response.json();
  const selections = {};
  for (const [id, selected] of Object.entries(data.selections || {})) {
    selections[id] = { selected: !!selected, dirty: false };
  }
  return selections;
}

export function getDirtySelections(selections) {
  const dirty = {};
  for (const [id, entry] of Object.entries(selections)) {
    if (entry.dirty) {
      dirty[id] = entry;
    }
  }
  return dirty;
}

export async function pushSelections(selections) {
  const body = { selections: {} };
  for (const [id, entry] of Object.entries(selections)) {
    body.selections[id] = !!entry.selected;
  }
  if (Object.keys(body.selections).length === 0) {
    return {};
  }
  const response = await fetch(getSelectionsUrl(), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    return { unauthorized: true };
  }
  if (!response.ok) {
    throw new Error(`Selections push failed: ${response.status}`);
  }
  // Mark pushed entries as clean.
  const clean = {};
  for (const [id, selected] of Object.entries(body.selections)) {
    clean[id] = { selected: !!selected, dirty: false };
  }
  return { selections: clean };
}

export function mergeSelections(local, server) {
  const merged = {};
  const allIds = new Set([
    ...Object.keys(local),
    ...Object.keys(server),
  ]);
  for (const id of allIds) {
    const localEntry = local[id];
    const serverEntry = server[id];
    if (!localEntry) {
      merged[id] = { ...serverEntry };
    } else if (!serverEntry) {
      merged[id] = { ...localEntry };
    } else if (localEntry.dirty) {
      merged[id] = { ...localEntry };
    } else {
      merged[id] = { ...serverEntry };
    }
  }
  return merged;
}

export function isSyncEnabled() {
  return !!(syncConfig.API_URL);
}
