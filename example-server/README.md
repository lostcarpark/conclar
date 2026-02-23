# Example Sync Server

This is a minimal sync server for demonstration and reference purposes only. It implements the
[sync server API](../docs/sync_server_api.md) with in-memory storage and a simple name-based login (no real
authentication).

**Do not use this in production.**

## Running

```sh
cd example-server
npm install
npm start
```

The server starts on `http://localhost:3001` by default.

## Configuring the app

In `src/config.json`, set the `SYNC.API_URL` to point at the example server:

```json
{
  "SYNC": {
    "API_URL": "http://localhost:3001/api/conclar"
  }
}
```

Then start the app with `npm start` from the project root. The login button in the navigation bar will let you enter a
display name to log in. Selections will be synced to the example server's in-memory store for the duration of the
session.
