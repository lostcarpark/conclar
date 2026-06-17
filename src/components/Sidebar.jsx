import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";

import configData from "../config.json";
import Header from "./Header";
import Navigation from "./Navigation";
import Footer from "./Footer";

// The drawer only exists below this width; above it the sidebar is inline.
// Keep in sync with the `@media (max-width: 768px)` breakpoint in App.css —
// the two must agree on where the layout switches.
const DRAWER_MEDIA_QUERY = "(max-width: 768px)";

// The sidebar is either inline (desktop) or a modal drawer (mobile). The same
// element is rendered in both spots; only one is visible at a given viewport.
// The drawer is a native <dialog> opened with showModal(), which provides the
// backdrop, focus trap, focus restore, Escape-to-close and background inert-ing.
const Sidebar = () => {
  const drawerRef = useRef(null);
  const openDrawer = () => drawerRef.current?.showModal();
  const closeDrawer = () => drawerRef.current?.close();

  // <dialog> doesn't light-dismiss, and ::backdrop isn't a real element, so we
  // detect backdrop clicks here. A click outside the dialog's box (i.e. on the
  // backdrop) still targets the dialog, so we check the point against its rect.
  const isPointOutsideDrawer = (e) => {
    const rect = drawerRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    );
  };

  // Only dismiss when both the press and the release land on the backdrop, so a
  // drag that begins inside the drawer (e.g. selecting text) and ends outside
  // doesn't close it. Track where the press started, then check the release.
  const pressedOnBackdrop = useRef(false);
  const onDrawerMouseDown = (e) => {
    pressedOnBackdrop.current = isPointOutsideDrawer(e);
  };
  const onDrawerClick = (e) => {
    if (pressedOnBackdrop.current && isPointOutsideDrawer(e)) closeDrawer();
  };

  // A modal drawer left open while the viewport grows past the breakpoint would
  // otherwise cover the now-inline sidebar; close it once we leave drawer mode.
  // (An open <dialog> stays a display:block modal overlay until explicitly
  // closed, so CSS alone can't hide it.)
  useEffect(() => {
    const mql = window.matchMedia(DRAWER_MEDIA_QUERY);
    const onChange = (e) => {
      if (!e.matches) drawerRef.current?.close();
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Close the drawer in response to an actual navigation. Skip the initial
  // mount so we only close on a real path change.
  const location = useLocation();
  const isInitial = useRef(true);
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    drawerRef.current?.close();
  }, [location.pathname]);

  // Rendered in both the inline desktop sidebar and the mobile drawer; only one
  // is visible at a given viewport. The page <h1> lives in <Header> for the
  // inline sidebar, but in drawer mode the topbar already carries the heading,
  // so the drawer's <Header> renders its title aria-hidden to avoid a duplicate.
  const navContents = (headingHidden) => (
    <>
      <Header
        title={configData.APP_TITLE}
        showNavigation={false}
        headingHidden={headingHidden}
      />
      <Navigation />
      <Footer />
    </>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-topbar">
        <button
          className="sidebar-toggle"
          onClick={openDrawer}
          aria-label="Open navigation"
        >
          <FaBars aria-hidden="true" />
        </button>
        <h1 className="sidebar-topbar-title">{configData.APP_TITLE}</h1>
      </div>
      <div className="sidebar-nav">{navContents(false)}</div>
      <dialog
        ref={drawerRef}
        className="sidebar-drawer"
        aria-label="Site navigation"
        onMouseDown={onDrawerMouseDown}
        onClick={onDrawerClick}
      >
        <button
          className="sidebar-drawer-close"
          onClick={closeDrawer}
          aria-label="Close navigation"
        >
          <FaTimes aria-hidden="true" />
        </button>
        {navContents(true)}
      </dialog>
    </aside>
  );
};

export default Sidebar;
