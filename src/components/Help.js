/**
 * Static help / how-to-use page for the VSS programme guide.  Edit the
 * JSX below to update content — no markdown fetch is involved, so
 * changes deploy with the next build.
 */
const Help = () => {
  return (
    <div className="info help">
      <h2>How to use the VSS Programme Guide</h2>

      <h3>Browsing the schedule</h3>
      <p>
        The <strong>Program</strong> page lists every session at the
        meeting in chronological order. Symposia, talk sessions, and
        poster topics appear at the top level; click any one to see the
        full description, and the talks or posters within are listed
        directly underneath.
      </p>

      <h3>Filtering and search</h3>
      <p>
        Use the dropdowns at the top of the Program page to narrow what
        you see. Each dropdown is searchable — start typing and the
        options will filter as you go. You can combine filters to
        intersect the results.
      </p>
      <ul>
        <li>
          <strong>Item type</strong> — show only Talks, Posters,
          Symposia, etc.
        </li>
        <li>
          <strong>Session</strong> — narrow to a particular session topic.
        </li>
        <li>
          <strong>Day</strong> — restrict to one or more conference days.
        </li>
        <li>
          <strong>Track</strong> — pick a research track to follow.
        </li>
        <li>
          <strong>Search</strong> — full-text search over titles,
          abstracts, and author names. If a child item (e.g. a single
          talk) matches your search, its parent session is also
          surfaced for context.
        </li>
      </ul>

      <h3>People and affiliations</h3>
      <p>
        The <strong>People</strong> page lists every author and
        presenter. Type into the affiliation filter to find everyone
        from a given institution, or search by name. Click any person
        to see their bio, affiliations, and every session they're part
        of.
      </p>

      <h3>Building your personal schedule</h3>
      <p>
        Click the checkbox next to any item to add it to{" "}
        <strong>My Schedule</strong>. Checking a session checkbox adds
        the session and all of its talks (or posters) at once — useful
        when you want to attend an entire symposium. Unchecking a
        session removes the whole group.
      </p>
      <p>
        If you only want a single talk from a session, click the
        individual talk's checkbox instead.
      </p>

      <h3>Sharing your schedule across devices</h3>
      <p>
        Visit <strong>My Schedule</strong> to see a chronological view
        of everything you've added. At the bottom of that page is a
        sharable link and QR code — open it on another device to copy
        your selections over.
      </p>

      <h3>Linking to a specific item</h3>
      <p>
        Each session, talk, and poster has a permalink (the chain icon
        next to its title). Sharing that URL takes the recipient
        straight to that item, expanded and shown in the context of
        its parent session.
      </p>

      <h3>Tips</h3>
      <ul>
        <li>
          Times shown are conference time. To also display your local
          time alongside, use the <strong>Settings</strong> page.
        </li>
        <li>
          You can switch between 12-hour and 24-hour time, dark and
          light mode, and toggle past-item visibility — all in
          Settings.
        </li>
        <li>
          The "Reset filters" button clears all current filters at
          once.
        </li>
      </ul>
    </div>
  );
};

export default Help;
