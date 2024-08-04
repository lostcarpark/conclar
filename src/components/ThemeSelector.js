import React from "react";

const LightStyle = React.lazy(() => import("./LightStyle"));
const DarkStyle = React.lazy(() => import("./DarkStyle"));

const ThemeSelector = ({ isDark, children }) => (
  <>
    <React.Suspense fallback={() => null}>
      {!isDark && <LightStyle />}
      {isDark && <DarkStyle />}
    </React.Suspense>
    {children}
  </>
);

export default ThemeSelector;
