// Forwards a config-rebuild failure to Vite's dev-server error overlay,
// in the shape `handleHotUpdate` hooks need to report it.
export function reportBuildError(server, plugin, configPath, err) {
  server.ws.send({
    type: "error",
    err: {
      message: err.message,
      stack: err.stack ?? "",
      plugin,
      id: configPath,
    },
  });
}

// Runs `rebuild` for a `handleHotUpdate` hook, reporting any failure to the
// error overlay instead of throwing (which would crash the dev server).
// Returns whether it succeeded, so the caller can decide what that means
// for the modules it returns.
export async function rebuildOrReport(server, plugin, configPath, rebuild) {
  try {
    await rebuild();
    return true;
  } catch (err) {
    reportBuildError(server, plugin, configPath, err);
    return false;
  }
}
