# ConClár

ConClár is an online Program Guide tool for conventions.

It has been developed in ReactJS and is intended to work in all modern browsers (sorry, it probably won't work in Internet Explorer). It is designed to work equally well on mobile and desktop devices.

ConClár is inspired by Eemeli Aro's [KonOpas](https://github.com/eemeli/konopas). As this uses a number of unsupported libraries, it was developed as a completely new application, rathering than trying to patch up the old code.

ConClár can be hosted on most webservers, and has been tested on Apache and Nginx. Some changes are required if your guide is not in the root directory of the website (see below). The programme data is read from JSON files, and is compatible with KonOpas files. There are several programme planning tools that should be compatible, though so far it has only been tested with Zambia.

## Getting Started

ConClár requires `npm` to install its dependencies. This is part of [Node.js](https://nodejs.org/), so start by going to the [Node.js download page](https://nodejs.org/en/download/). Grab the latest installer for your operating system, and install it. You should do this on your local computer, not your webserver.

Next create a local directory for your ConClár project. You can put this anywhere in your filesystem.

Next you need to get the code from GitHub. You can either use the download link to get a Zip file, or clone the project with the `git` command. If you are customising for your convention, you should consider creating a fork so that you can merge in future changes.

Once you've done that, run the following from a command prompt in the directory you created above:

### `npm install`

This will install everything needed to run the project.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [React app deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Customisation

The main place customisations go is the `src/config.json` file. Settings currently available include:

- `BASE_PATH`: The path to ConClár within your webserver. Set to '/' to run in the root directory. See below for running in a subdirectory.
- `APP_ID`: A unique id to distinguish between instances of multi-year conventions.
- `APP_TITLE`: The title to appear at the top of the webpage, and in the browser window title.
- `PROGRAM_DATA_URL`: The address of the file containing programme data.
- `PEOPLE_DATA_URL`: The address of the file listing people. If these are the same, both will be read from one file, but programme data must come before people data.
- `FETCH_OPTIONS`: A JSON object containing options to pass when fetching data. See JavaScript [fetch()](https://developer.mozilla.org/en-US/docs/Web/API/fetch) documentation for available valies. Typical examples:
  - `"cache": "reload"` - Should always be used so beck end program updates will be read.
  - `"credentials": "omit"` - Use if source is not using a certificate from a recognised authority, e.g. a self signed cert.
  - `"headers": { "Origin": "http://example.com" }` - Headers sent in the fetch. Origin may be required for Cross Origin Resource Sharing (CORS).
- `TIMEZONE`: The name of the timezone where your convention takes place. Viewers outside convention timezone will see times in convention time, and their local time below it.
- `INTERACTIVE`: Set to `false` to get a non-interactive, expanded view of the schedule. The info page is also included, but not the participant list, individual participant pages, or individual item pages (regardless of the `PERMALINK.SHOW_PERMALINK` setting).
- `NAVIGATION`: Each value in this section sets the label that will appear on main navigation of the site. Useful for switching between different international spellings of "programme".
- `NAVIGATION.PROGRAM`: Label for program/programme menu.
- `NAVIGATION.PEOPLE`: Label for people menu.
- `NAVIGATION.MYSCHEDULE`: Label for user's personal schedule.
- `NAVIGATION.INFO`: Label for the Information menu link._
- `NAVIGATION.EXTRA`: An array of extra menu links. Each entry should take the form: `{ "LABEL": "Octocon Home", "URL": "https://octocon.com" }`. To have no extra links, set to `"EXTRA": []` or delete `EXTRA` entry altogether.
- `LOCATIONS.SEARCHABLE`: Whether the location list can be searched by typing. (Searching can be inconvenient on touch screens.)
- `TAGS.PLACEHOLDER`: The placeholder when selecting tags (unless separated).
- `TAGS.SEARCHABLE`: Whether the tag list can be searched by typing (unless separated).
- `TAGS.HIDE`: If true, hide the tags drop-down. Tags still displayed on items.
- `TAGS.SEPARATE`: An array of tag prefixes to separate into individual drop-downs, and if drop-down is searchable or hidden. Tags should be specified as follows: `{ "PREFIX": "type", "PLACEHOLDER": "Select type", "SEARCHABLE": true|false, "HIDE": true|false }`.
- `TAGS.FORMAT_AS_TAG`: If set to true, turns Grenadine item format into a KonOpas-style "type" tag.
- `TAGS.DAY_TAG.GENERATE`: If set to true, will generate tags for each day of the convention.
- `TAGS.DAY_TAG.PLACEHOLDER`: The placeholder for the "day" tags drop down.
- `TAGS.DAY_TAG.SEARCHABLE`: Whether day tag list can be searched by typing.
- `TAGS.DAY_TAG.HIDE`: If true, hide day tags drop-down. Day tags still shown on items if GENERATE true.
- `PERMALINK.SHOW_PERMALINK`: If true, display a "permalink" icon when each program item is expanded.
- `PERMALINK.PERMALINK_TITLE`: "Title" text displayed when mouse is hovered over permalink icon.
- `EXPAND.EXPAND_ALL_LABEL`: Label text for Expand All button.
- `EXPAND.COLLAPSE_ALL_LABEL`: Label for Collapse All button.
- `EXPAND.SPRING_CONFIG`: Config to apply to the configuration of the 'spring' when expanding items. This may be a simply duration, such as `{ "duration": 100 }` to expand in 100ms, or can configure more dynamic spring effects, such as `{ mass: 1, tension: 1000, friction: 30 }`. Full list of options in [react-spring documentation](https://react-spring.io/common/configs).
- `ITEM_DESCRIPTION.PURIFY_OPTIONS`: Pass additional options to DOMPurify when processing item descriptions. For the available options, see [the DOMPurify documentation](https://github.com/cure53/DOMPurify#can-i-configure-dompurify). Format options as JSON, _e.g._, `{"FORBID_ATTR": ["style"]}`.
- `LINKS`: An array of link types expected in the program data.  Individual entries should take the form `{"NAME": "signup", "TEXT": "Click to sign up", "TAG": ""}`.  `NAME` should be the name of the link as it appears in the links object in the program data.  `TEXT` is the text that should appear on this link in ConClár.  `TAG` is an optional tag to add to every program item which includes a matching link.  If using prefixed tags, include the prefix, *e.g.*, `"type:Workshop"`.
- `LOCAL_TIME.CHECKBOX_LABEL`: Label for the "Show Local Time" checkbox.
- `LOCAL_TIME.NOTICE`: Label for notie telling users how local time displayed.
- `LOCAL_TIME.PREV_DAY`: Label appended to local time if local time is before start of advertised day.
- `LOCAL_TIME.NEXT_DAY`: Label appended to local time if local time is after end of advertised day.
- `LOCAL_TIME.FAILURE`: Local time depends on string conversions, and could fail in some circumstances. Display this message if unable to convert.
- `TIME_FORMAT.DEFAULT_12HR`: Set to true if you want time displayed in 12 hour format by default.
- `TIME_FORMAT.SHOW_CHECKBOX`: If set to false, users will not be given option to change between 12 and 24 hour time.
- `TIME_FORMAT.CHECKBOX_LABEL`: Label for the 12 hour time checkbox label.
- `DURATION.SHOW_DURATION`: If true, `mins` from program data will be displayed.
- `DURATION.DURATION_LABEL`: Format for duration. `@mins` will be replaced by number of minutes. Note: do not translate `@mins`.
- `SHOW_PAST_ITEMS.SHOW_CHECKBOX`: Set to true to show the option during the convention; otherwise past programme items are shown by default.
- `SHOW_PAST_ITEMS.CHECKBOX_LABEL`: Label for the show past items checkbox.
- `SHOW_PAST_ITEMS.ADJUST_MINUTES`: Some wiggle room (in minutes) in order not to hide past items immediately as they start.
- `PEOPLE.THUMBNAILS.SHOW_THUMBNAILS`: Set to false to not show member thumbnails (useful to remove spurious controls if pictures not in file).
- `PEOPLE.THUMBNAILS.SHOW_CHECKBOX`: Set to false to hide "Show thumbnails" checkbox.
- `PEOPLE.THUMBNAILS.CHECKBOX_LABEL`: Label for "Show thumbnails" checkbox.
- `PEOPLE.THUMBNAILS.DEFAULT_IMAGE`: Set to default thumbnail for participants with no photo. Can be filename of image in public directory, or external URL. Leave blank for no default thumbnail.
- `PEOPLE.SORT.SHOW_CHECKBOX`: Set to false to hide "Sort by full name" checkbox. Useful if your data only contains "name for publications".
- `PEOPLE.SORT.CHECKBOX_LABEL`: Label for "Sort by full name" checkbox.
- `PEOPLE.SEARCH.SHOW_SEARCH`: Set to false to hide "people" search box.
- `PEOPLE.SEARCH.SEARCH_LABEL`: Label for "people2 search box.
- `PEOPLE.BIO.PURIFY_OPTIONS`: Pass additional options to DOMPurify when processing participant bios. For more details, see `ITEM_DESCRIPTION.PURIFY_OPTIONS` above.
- `USELESS_CHECKBOX.CHECKBOX_LABEL`: Label for any useless checkboxes.
- `SETTINGS.TITLE.LABEL`: Label for settings page.
- `SETTINGS.TIME_FORMAT.LABEL`: Label for time format group.
- `SETTINGS.TIME_FORMAT.T12_HOUR_LABEL`: Label for 12 hour option.
- `SETTINGS.TIME_FORMAT.T24_HOUR_LABEL`: Label for 24 hour option.
- `SETTINGS.SHOW_LOCAL_TIME.LABEL`: Label for Show Local Time option group.
- `SETTINGS.SHOW_LOCAL_TIME.NEVER_LABEL`: Label for "Never show" option.
- `SETTINGS.SHOW_LOCAL_TIME.DIFFERS_LABEL`: Label for "Display if different from Convention timezone".
- `SETTINGS.SHOW_LOCAL_TIME.ALWAYS_LABEL`: Label for "Always display" option.
- `SETTINGS.SELECT_TIMEZONE.LABEL`: Lable for select timezone group,
- `SETTINGS.SELECT_TIMEZONE.BROWSER_DEFAULT_LABEL`: Label to use browser default timezone (will have name of timezone appended).
- `SETTINGS.SELECT_TIMEZONE.SELECT_LABEL`: Label to select explicit timezone.
- `INFORMATION.MARKDOWN_URL`: The address of the markdown file containing additional information about the convention.
- `INFORMATION.LOADING_MESSAGE`: Text to show while Markdown file is loading (usually never seen).
- `FOOTER.SITE_NOTE_MARKDOWN`: General note displayed in the footer of the page. May use Markdown for encoding of links, emphesis, etc.
- `FOOTER.CONCLAR_NOTE_MARKDOWN`: Note crediting ConClár. You are free to remove or modify this, but we politely request retaining to help promote this free tool.
- `TIMER.FETCH_INTERVAL_MINS`: Number of minutes between refreshes of program data.
- `TIMER.TIMER_TICK_SECS`: Number of seconds between checks of timer.
- `DEBUG_MODE.ENABLE`: If true, display banner showing online status, and allowing manual data fetch.
- `DEBUG_MODE.ONLINE_LABEL`: Label to display in debug mode when online.
- `DEBUG_MODE.OFFLINE_LABEL`: Label to display in debug mode when offline.
- `DEBUG_MODE.FETCH_BUTTON_LABEL`: Label to display in debug mode on Fetch button.

More settings will be added to this file in future versions.

To customise the site heading, edit the `src/components/Header.js` file.

The convention information page is composed in Markdown using the provided file, `public/info.md`. Markdown is a common standard for formatting text that is easy to follow and safer than HTML. There is a handy cheat sheet.

To change the styling, edit `src/App.css`. Note that the current styling is temporary, and a better default theme with easier customisation is planned.

To change the home screen app name, edit `public/manifest.json`.

## Hosting

ConClár is fairly simple to host on most webservers. However it does require that all requests get directed to index.html. Instruction for this on Apache and Nginx are included below.

After running `npm run build` just copy the build directory to the public directory of your webserver.

### Hosting in a subdirectory

If you need to put ConClár in a subdirectory on your webserver, you'll need to carry out the following additional steps:

1. Edit the `BASE_PATH` setting in your `config.json` file. To put in a directory called "guide", set `BASE_PATH` to "/guide/".
2. Edit the `package.json` file and add a `homepage` setting as shown below.
3. Set appropriate settings for the webserver to find the `index.html` in the subdirectory.
4. Use `npm run build` to prepare the application to upload.

The `package.json` file should start as follows:

```
  {
    "name": "conclar",
    "version": "0.1.0",
    "private": true,
    "homepage": "/guide",
  ...
```

### Hosting on Apache

On Apache, the easiest way to direct traffic to `index.html` is by way of a `.htaccess` file. A default .htaccess is included in the `public` directory. This will get copied to the `build` directory, but may get hidden when you copy to your webserver. The contents are as follows:

```
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-l
    RewriteRule . /index.html [L]
</IfModule>
```

If you are hosting in a subdirectory, modify `.htaccess` as follows (replace "guide" with the folder you are hosting in):

```
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /guide/
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-l
    RewriteRule . /guide/index.html [L]
</IfModule>
```

### Hosting on Nginx

On Nginx, the following needs to go in your `.conf` file:

```
    location / {
            try_files $uri /index.html;
    }
```

For hosting in a subdirectory, this should be altered as follows:

```
    location /guide {
            try_files $uri /guide/index.html;
    }
```

## File Format

The ConClár file format is designed to be compatible with KonOpas, and in most cases data files for KonOpas can be used without modification.

Full details of the file format are in a separate [Data Structure document](https://github.com/lostcarpark/conclar/blob/main/docs/conclar_file_specs.md).

## Credits

ConClár is Copyright James Shields, 2022, and made available as an open source project under the MIT licence.

Thanks to:

- Eemeli Aro for developing KonOpas, which was the inspiration for ConClár.
- M. C. DeMarco for work on styling and lots of helpful suggestions.
- Leane Verhulst for testing and documentation contributions.
- Annemarie Nungent for checking my Irish.
- Fionna O'Sullivan for proofreading and awesome suggestions.

The included "rainbow head" thumbnail image is a public domain image available on [Open Clipart](https://openclipart.org/detail/296715/rainbow-head-2).
