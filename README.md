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

* `APP_TITLE`: The title to appear at the top of the webpage, and in the browser window title.
* `PROGRAM_DATA_URL`: The address of the file containing programme data.
* `PEOPLE_DATA_URL`: The address of the file listing people. If these are the same, both will be read from one file, but programme data must come before people data.
* `NAVIGATION`: Each value in this section sets the label that will appear on main navigation of the site. Useful for switching between different international spellings of "programme".
* `INFORMATION.MARKDOWN_URL`: The address of the markdown file containing additional information about the convention.

More settings will be added to this file in future versions.

To customise the site heading, edit the `src/components/Header.js` file.  

The convention information page is composed in Markdown using the provided file, `public/info.md`.  Markdown is a common standard for formatting text that is easy to follow and safer than HTML.  There is a handy cheat sheet.

To change the styling, edit `src/App.css`. Note that the current styling is temporary, and a better default theme with easier customisation is planned.

To change the home screen app name, edit `public/manifest.json`.

## 
