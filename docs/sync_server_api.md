# Sync server API

The ConClar programme guide supports syncing a user's selections (favourites) to a server so they are available across
devices. The server runs on a separate subdomain (e.g. `auth.example.com`) from the SPA (e.g.
`guide.example.com`).

All merge logic lives in the client. The server stores and retrieves selections.
Selections are scoped by authenticated user and `app_id`.

## Authentication

Authentication is cookie-based, shared across subdomains.

### Login flow

1. Client renders an `<a>` link to `login_url` (from the profile response) with `<return_url>` replaced.
2. Auth server authenticates the user (method is server-defined, e.g. OAuth, password, etc.).
3. Auth server sets a session cookie and redirects back to the programme guide.
4. SPA reloads, fetches profile, syncs selections.

### Logout flow

1. Client renders an `<a>` link to `logout_url` with `<return_url>` replaced.
2. Auth server clears the session cookie and redirects back.
3. Local selections remain intact in the browser.

### Cookie attributes

The session cookie MUST be set with:

```
Set-Cookie: session=<token>; Domain=.example.com; Path=/; HttpOnly; Secure; SameSite=None
```

- `Domain=.example.com` -- MUST be the shared parent domain so the cookie is sent to both subdomains
- `HttpOnly` -- MUST be set to prevent XSS from stealing the session cookie
- `Secure` -- MUST be set (HTTPS only)
- `SameSite=None` -- MUST be set for cross-origin credentialed requests to work

### CORS configuration

The SPA makes credentialed cross-origin requests to the API. The server MUST respond with:

```
Access-Control-Allow-Origin: https://guide.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

`Access-Control-Allow-Origin` MUST be the exact origin, not `*` -- browsers reject `*` when credentials are included.

If more than one SPA origin is supported, the server SHOULD dynamically echo an allowed origin value and send
`Vary: Origin`.

### CSRF protection

Because `SameSite=None` means the cookie is sent on cross-origin requests, CSRF is possible. The server MUST check the
`Origin` header on PATCH requests and reject any that don't match the expected programme guide origin. Modern browsers
always send `Origin` on CORS requests.

## Endpoints

### Common response error shape

Error response bodies SHOULD use this format across all endpoints:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "All selection values must be boolean"
  }
}
```

`code` SHOULD be a stable machine-readable string; `message` SHOULD be human-readable and safe to display.

### `GET /profile`

Returns the current authentication state. The client calls this on startup to determine whether to show a login link or
sync selections.

**Authenticated response:**

```json
{
  "authenticated": true,
  "id": "A0001",
  "display_name": "alice",
  "logout_url": "https://auth.example.com/logout?return_to=<return_url>"
}
```

**Not authenticated response:**

```json
{
  "authenticated": false,
  "login_url": "https://auth.example.com/login?return_to=<return_url>"
}
```

#### `<return_url>` placeholder

The `login_url` and `logout_url` values SHOULD contain the literal string `<return_url>`. The client replaces this
with `encodeURIComponent(window.location.href)` before navigating, so the user is redirected back to the same page.

When the server receives a request with a return URL, it MUST:

1. Validate it against an allowlist of origins to prevent open redirects.
2. If valid, redirect to it after completing login/logout.
3. If invalid or missing, redirect to a sensible default.

### `GET /apps/<app_id>/selections`

Returns all of the user's selections for the specified app.

`app_id` is a required path parameter and SHOULD match the client's configured `APP_ID`.

**Response:**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "selections": {
    "item-123": true,
    "item-456": false
  }
}
```

**Error responses:**

- `400 Bad Request` -- invalid `app_id`
- `401 Unauthorized` -- session cookie missing or invalid
- `405 Method Not Allowed` -- unsupported method on this route

### `PATCH /apps/<app_id>/selections`

The client sends changed selection values. The server stores them and returns no response body.

`app_id` is a required path parameter and SHOULD match the client's configured `APP_ID`. The server MAY validate the
`app_id` against a list of known app ids and return a 400 Bad Request if it is not in the list.

Values in `selections` MUST be JSON booleans (`true` or `false`). Non-boolean values MUST be rejected.

`false` is different from an omitted key. Omitted means “no opinion”; `false` means explicitly not selected. The server
MUST store and return `false` values explicitly.

The write is atomic: either all provided key/value pairs are persisted, or none are.

#### Request validation rules

For this endpoint, the server MUST enforce all of the following:

- Request `Content-Type` MUST be `application/json`.
- Body MUST be valid JSON.
- Body MUST contain a top-level `selections` object.
- `selections` keys MUST be item IDs (opaque strings).
- `selections` values MUST be JSON booleans (`true` or `false`).

If `Content-Type` is invalid, the server SHOULD return `415 Unsupported Media Type`.
If any other rule fails, the server MUST return `400 Bad Request`.
For all validation failures, the server MUST NOT persist any changes.

An empty object (`{"selections": {}}`) is valid and SHOULD return `204 No Content`.

**Request:**

```
PATCH /apps/O2021/selections HTTP/1.1
Content-Type: application/json

{
  "selections": {
    "item-123": true,
    "item-456": false
  }
}
```

**Success response:**

```
HTTP/1.1 204 No Content
```

**Error responses:**

- `400 Bad Request` -- invalid `app_id`
- `400 Bad Request` -- request body is invalid
  (for example, malformed JSON, missing `selections`, or non-boolean value). No changes are persisted.
- `401 Unauthorized`
- `405 Method Not Allowed`
- `415 Unsupported Media Type` -- content type is not `application/json`
- `429 Too Many Requests` -- server-side rate limiting (optional)
- `5xx` -- transient server error

## Limitations

- **Last-writer-wins**: When two devices change the same item, the most recently synced change wins. If device A selects
  an item and device B deselects it, the result depends on which syncs last, not which action the user performed last.
  This is acceptable for convention favourites.

- **No real-time sync**: Changes only propagate when a device loads the page. Two devices open simultaneously won't see
  each other's changes until one reloads. Push-based sync (e.g. WebSockets) is not supported.

## Reference implementation

This section is non-normative and provided as an example only.

### PATCH logic

```js
function patchSelections(user, request) {
  const appId = request.params.app_id;
  if (!appId) {
    return {
      status: 400,
      body: { error: "Invalid app_id" },
    };
  }

  // Validate all entries before writing any.
  const entries = Object.entries(request.body.selections);
  for (const [, selected] of entries) {
    if (typeof selected !== "boolean") {
      return {
        status: 400,
        body: { error: "All selection values must be boolean" },
      };
    }
  }

  user.selectionsByApp ||= {};
  user.selectionsByApp[appId] ||= {};

  for (const [itemId, selected] of entries) {
    user.selectionsByApp[appId][itemId] = selected;
  }

  return {
    status: 204,
  };
}
```

### GET logic

```js
function getSelections(user, request) {
  const appId = request.params.app_id;
  if (!appId) {
    return {
      status: 400,
      body: { error: "Invalid app_id" },
    };
  }

  return {
    status: 200,
    body: { selections: user.selectionsByApp?.[appId] || {} },
  };
}
```