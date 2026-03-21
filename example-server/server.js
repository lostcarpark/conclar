import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import escapeHtml from "escape-html";

const PORT = 3001;
const BASE_PATH = "/api/conclar";
const ALLOWED_ORIGINS = ["http://localhost:3000"];

const app = express();
app.use(cookieParser());

// --- Session store (in-memory) ---

const sessions = new Map(); // token -> { userId, displayName }
const users = new Map(); // userId -> { selectionsByApp: { appId: { itemId: bool } } }

function getSession(req) {
  const token = req.cookies.session;
  if (!token) {
    return null;
  }
  return sessions.get(token) || null;
}

function createSession(res, userId, displayName) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, displayName });
  // Production servers should use sameSite: "none" with secure: true (HTTPS).
  // SameSite=None is needed because the SPA and API are on different subdomains
  // (cross-origin), and Lax doesn't send cookies on cross-origin fetch requests
  // like the PATCH to /selections.
  // For local development, both the SPA and server are on localhost (same-site),
  // but SameSite=None requires Secure which requires HTTPS. Lax works here
  // because same-site fetch requests include Lax cookies.
  res.cookie("session", token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return token;
}

function destroySession(req, res) {
  const token = req.cookies.session;
  if (token) {
    sessions.delete(token);
  }
  res.clearCookie("session", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
}

function getUser(userId) {
  if (!users.has(userId)) {
    users.set(userId, { selectionsByApp: {} });
  }
  return users.get(userId);
}

function isAllowedReturnUrl(url) {
  try {
    return ALLOWED_ORIGINS.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

// --- CORS ---

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// --- Login page ---

app.get(`${BASE_PATH}/login`, (req, res) => {
  const returnTo = req.query.return_to || "/";
  res.set("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<head><title>Log in</title></head>
<body>
  <h1>Log in</h1>
  <form method="POST" action="${BASE_PATH}/login">
    <input type="hidden" name="return_to" value="${escapeHtml(returnTo)}">
    <label for="name">Display name:</label>
    <input type="text" id="name" name="name" required autofocus>
    <button type="submit">Log in</button>
  </form>
</body>
</html>`);
});

app.post(`${BASE_PATH}/login`, express.urlencoded({ extended: false }), (req, res) => {
  const name = (req.body.name || "").trim();
  if (!name) {
    return res.redirect(`${BASE_PATH}/login?return_to=${encodeURIComponent(req.body.return_to || "/")}`);
  }
  createSession(res, name, name);
  const returnTo = req.body.return_to || "/";
  if (!isAllowedReturnUrl(returnTo)) {
    return res.redirect("/");
  }
  res.redirect(returnTo);
});

// --- Logout ---

app.get(`${BASE_PATH}/logout`, (req, res) => {
  destroySession(req, res);
  const returnTo = req.query.return_to || "/";
  if (!isAllowedReturnUrl(returnTo)) {
    return res.redirect("/");
  }
  res.redirect(returnTo);
});

// --- GET /profile ---

app.get(`${BASE_PATH}/profile`, (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.json({
      authenticated: false,
      login_url: `http://localhost:${PORT}${BASE_PATH}/login?return_to=<return_url>`,
    });
  }
  return res.json({
    authenticated: true,
    id: session.userId,
    display_name: session.displayName,
    logout_url: `http://localhost:${PORT}${BASE_PATH}/logout?return_to=<return_url>`,
  });
});

// --- GET /apps/:app_id/selections ---

app.get(`${BASE_PATH}/apps/:app_id/selections`, (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: { code: "unauthorized", message: "Not authenticated" } });
  }
  const appId = req.params.app_id;
  if (!appId) {
    return res.status(400).json({ error: { code: "invalid_request", message: "Invalid app_id" } });
  }
  const user = getUser(session.userId);
  res.json({ selections: user.selectionsByApp[appId] || {} });
});

// --- PATCH /apps/:app_id/selections ---

app.patch(`${BASE_PATH}/apps/:app_id/selections`, express.json(), (req, res) => {
  // CSRF check
  const origin = req.headers.origin;
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: { code: "forbidden", message: "Invalid origin" } });
  }

  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: { code: "unauthorized", message: "Not authenticated" } });
  }

  const appId = req.params.app_id;
  if (!appId) {
    return res.status(400).json({ error: { code: "invalid_request", message: "Invalid app_id" } });
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return res.status(415).json({ error: { code: "unsupported_media_type", message: "Content-Type must be application/json" } });
  }

  if (!req.body || typeof req.body.selections !== "object" || req.body.selections === null) {
    return res.status(400).json({ error: { code: "invalid_request", message: "Body must contain a selections object" } });
  }

  const entries = Object.entries(req.body.selections);
  for (const [, selected] of entries) {
    if (typeof selected !== "boolean") {
      return res.status(400).json({ error: { code: "invalid_request", message: "All selection values must be boolean" } });
    }
  }

  if (entries.length === 0) {
    return res.sendStatus(204);
  }

  const user = getUser(session.userId);
  user.selectionsByApp[appId] ||= {};
  for (const [itemId, selected] of entries) {
    user.selectionsByApp[appId][itemId] = selected;
  }

  res.sendStatus(204);
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`Example sync server running at http://localhost:${PORT}`);
  console.log(`API base path: ${BASE_PATH}`);
});
