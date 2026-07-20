import "./polyfills";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Set publicUrl from Vite's BASE_URL environment variable
window.publicUrl = import.meta.env.BASE_URL;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
