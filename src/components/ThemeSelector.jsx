import { useEffect } from "react";

/**
 * Resolves the dark-mode setting to <html data-theme="light"|"dark"> so the
 * CSS (see darkmode.css) only ever needs a single attribute selector:
 *
 *   - "light" / "dark": force that theme.
 *   - "browser" (or anything else): follow the OS preference, tracking it
 *     live via a matchMedia listener.
 *
 * Keep in sync with the pre-paint resolver in index.html.
 */
const ThemeSelector = ({ mode, children }) => {
  useEffect(() => {
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark = mode === "dark" || (mode !== "light" && !!prefersDark?.matches);
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
    };
    apply();
    if (mode !== "browser" || !prefersDark) {
      return;
    }
    prefersDark.addEventListener("change", apply);
    return () => prefersDark.removeEventListener("change", apply);
  }, [mode]);

  return <>{children}</>;
};

export default ThemeSelector;
