// Resolve the theme before first paint to avoid a flash. Mirrors the
// resolution logic in ThemeSelector: "dark"/"light" force it, anything
// else (incl. "browser" or no saved choice) follows the OS preference.
(function () {
  try {
    var mode = localStorage.getItem("dark_mode");
    var isDark =
      mode === "dark" ||
      (mode !== "light" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  } catch (e) {}
})();
