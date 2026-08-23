# ConClár

ConClár is an online Program Guide tool for conventions.

It has been developed in ReactJS and is intended to work in all modern browsers (sorry, it probably won't work in Internet Explorer). It is designed to work equally well on mobile and desktop devices.

ConClár is inspired by Eemeli Aro's [KonOpas](https://github.com/eemeli/konopas). As this uses a number of unsupported libraries, it was developed as a completely new application, rather than trying to patch up the old code.

ConClár can be hosted on most webservers, and has been tested on Apache and Nginx. Some changes are required if your guide is not in the root directory of the website (see below). The programme data is read from JSON files, and is compatible with KonOpas files. There are several programme planning tools that should be compatible, though so far it has only been tested with Zambia.

## Getting Started

ConClár requires `npm` to install its dependencies. This is part of [Node.js](https://nodejs.org/), so start by going to the [Node.js download page](https://nodejs.org/en/download/). Grab the latest installer for your operating system, and install it. You should do this on your local computer, not your webserver.

Next create a local directory for your ConClár project. You can put this anywhere in your filesystem.

Next you need to get the code from GitHub. You can either use the download link
to get a Zip file, or clone the project with the `git` command. If you are
customising for your convention, you should consider creating a fork so that you
can merge in future changes.

ConClár requires a configuration file called in the `/src/` directory called
`config.json`. To avoid local customizations getting pushed to the main
repository, this not included. Instead, there is a sample config file that is a
good starting point. You should copy this to the correct name. If you have a
fork of the project, you may want to remove `/src/config.json` from
`.gitignore`, to track your convention's customizations. You can copy the
example with the following command:

```cp src/config_example.json src/config.json```

Once you've done that, run the following from a command prompt in the directory you created above:

```npm install```

This will install everything needed to run the project.

## Available Scripts

In the project directory, you can run:

```npm start```

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

```npm run build```

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

`npm run preview`

Preview the production build locally before deploying.

See the [Vite deployment documentation](https://vite.dev/guide/static-deploy.html) for more information about deploying your app.

## Customisation

The main place customisations go is the `src/config.json` file. The full list of
available settings, with descriptions, types, and defaults, is in the
[configuration documentation](docs/config_reference.md). That page is generated
from `src/configSchema.json` (run `npm run docs:generate` after changing the
schema); `npm start` and `npm run build` validate your `config.json` against the
same schema and will fail with a clear error if a setting is missing or
malformed.

To customise the site heading, edit the `src/components/Header.js` file.

The convention information page is composed in Markdown using the provided file, `public/info.md`. Markdown is a common standard for formatting text that is easy to follow and safer than HTML. There is a handy cheat sheet.

To change the styling, edit `src/App.css`. If you want to just change the basic colours, edit the `--brand-tint`, `--gray-tint` and `--info-tint` values. You can make them all the same, or choose different values for more control. If you want more control over the specific shades, you can manually edit the `--<type>-<nnn>` variables in Tier 2.

To change the home screen app name, edit `public/manifest.json`.

## Show map for location

A link to a map for finding the location can be showed on the program items. This is defined in the `LOCATIONS.MAPPING` 
config field. This should be an array of objects where the `KEY` field should match the location name used in the programme data.

There are 2 methods available for showing the map.

### External link

Set the `MAP_URL` field to the URL for the map to the location.

### Highlight location in inline SVG map

Create a map in SVG format with each location identified with unique ids. Put the file at `src/map.svg`. Set the 
`ID` field to respective ids set in `map.svg`.

#### Styling

Configure the styling of the highlighted location in the inline SVG map in the config field 
`LOCATIONS.HIGHLIGHT_STYLE`. It could for example be set to `fill: var(--brand-400) !important;`. Using a variable 
like `--brand-400` means that the highlight will follow the color scheme of ConClár.

When creating the SVG file you can also use the CSS variables otherwise used ConClár. See `src/App.css` for 
available variables. Apart from making the colors of the map harmonize with ConClár this will also make light / dark 
mode look better.

## Hosting

ConClár is fairly simple to host on most webservers. However it does require that all requests get directed to index.html. Instruction for this on Apache and Nginx are included below.

After running `npm run build` just copy the build directory to the public directory of your webserver.

### Hosting in a subdirectory

If you need to put ConClár in a subdirectory on your webserver, you'll need to carry out the following additional steps:

1. Edit the `vite.config.js` file and add a `base` setting as shown below.
2. Set appropriate settings for the webserver to find the `index.html` in the subdirectory.
3. Use `npm run build` to prepare the application to upload.

The `vite.config.js` file should be modified as follows (replace "guide" with your subdirectory name):

```javascript
export default defineConfig({
  base: "/guide/",
  plugins: [react()],
  // ... rest of config
});
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

Full details of the file format are in a separate [Data Structure document](docs/conclar_file_specs.md).

## Syncing selections across devices

By default, users' programme selections are stored only in the browser's local storage. Users can share their schedule between devices using the QR code / link sharing feature on the My Schedule page, without needing any server infrastructure.

If you want selections to sync automatically across devices, you can set up a sync server. When configured, users can log in and their selections will be saved to the server and loaded on any device they sign in to.

To enable sync, add the `SYNC` section to your `config.json` with at least an
`API_URL` pointing to your server. See the `SYNC.*` settings in [configuration
document](docs/config_reference.md) for the available options. If you don't need sync,
simply leave the `SYNC` section out of your config and everything else works as
normal.

The sync server API is documented in [docs/sync_server_api.md](docs/sync_server_api.md). You can find an example server in [example-server](example-server), though this should never be used in production.

## Credits

ConClár is Copyright James Shields, 2022, and made available as an open source project under the MIT licence.

Thanks to:

- Eemeli Aro for developing KonOpas, which was the inspiration for ConClár.
- M. C. DeMarco for work on styling and lots of helpful suggestions.
- Leane Verhulst for testing and documentation contributions.
- Annemarie Nungent for checking my Irish.
- Fionna O'Sullivan for proofreading and awesome suggestions.

The included "rainbow head" thumbnail image is a public domain image available on [Open Clipart](https://openclipart.org/detail/296715/rainbow-head-2).
