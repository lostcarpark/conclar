# ConClár Data Structure

This is a document defining the data structures to be used with ConClár, i.e. the format for the JSON-formatted files that make up the programme database. These file(s) will need to define up to two entities: program items and people.

This is a work in progress, so stuff may still change at any time.

---

## File Format

Schedule and people data is fetched from the file(s) configured via `DATA_URLS` or `PROGRAM_DATA_URL`/`PEOPLE_DATA_URL` in `config.json` — see the [Customisation](../README.md#customisation) section of the README for how those are set. This section describes the shape of the fetched file(s) themselves; it does not affect the shape of individual program items or people — see [Program Array](#program-array) and [People Array](#people-array) below for those.

### Files fetched via `DATA_URLS`

Each file is a JSON object with a required top-level `schemaVersion` integer identifying its shape (see below). A file with a missing or unrecognized `schemaVersion` is an error.

#### `schemaVersion: 2`

A JSON object with `schedule` and/or `people` arrays as properties (whichever the file is responsible for), plus the required `schemaVersion`. It also has an optional `info` property so that files can carry their own publishing metadata (see below).

If `SCHEDULE` and `PEOPLE` point to different files:

```javascript
// schedule.json
{
	"schemaVersion": 2,
	"info": { "version": "1.0", "published": "2026-07-01T12:00:00Z" },
	"schedule": [
		{ "id": "1234", "title": "A Really Cool Item Title", ... },
		...
	]
}
```

```javascript
// people.json
{
	"schemaVersion": 2,
	"info": { "version": "1.0", "published": "2026-07-01T12:00:00Z" },
	"people": [
		{ "id": "1234", "name": [ "Galahad", "", "Sir" ], ... },
		...
	]
}
```

If using `COMBINED`, both arrays and a single shared `info` block are read from one file:

```javascript
// combined.json
{
	"schemaVersion": 2,
	"info": { "version": "1.0", "published": "2026-07-01T12:00:00Z" },
	"schedule": [
		{ "id": "1234", "title": "A Really Cool Item Title", ... },
		...
	],
	"people": [
		{ "id": "1234", "name": [ "Galahad", "", "Sir" ], ... },
		...
	]
}
```

`info` is a free-form object for publisher-defined metadata about the file, such as a version or publish date. ConClár does not validate its contents or display them anywhere in the app — it is only logged to the browser console when a file is fetched, as a debugging aid for publishers. `version` and `published` above are illustrative examples, not required fields. Unlike `schemaVersion`, `info` is optional.

### Files fetched via `PROGRAM_DATA_URL` / `PEOPLE_DATA_URL`

This format is based on the layout used by KonOpas and should be backward compatible with it (i.e. an export created for KonOpas should work fine here). [KonOpas Data Formats](https://konopas.github.io/data-fmt)

The file is a bare JSON array of items — either program items or person items, as described later in this document.

If `PROGRAM_DATA_URL` and `PEOPLE_DATA_URL` point to different files, each file contains just its own array:

```javascript
// program.js
[
	{ "id": "1234", "title": "A Really Cool Item Title", ... },
	...
]
```

```javascript
// people.js
[
	{ "id": "1234", "name": [ "Galahad", "", "Sir" ], ... },
	...
]
```

If `PROGRAM_DATA_URL` and `PEOPLE_DATA_URL` are the same, both arrays are read from one file, with the program array first, followed by the people array:

```javascript
// combined.js
[
	{ "id": "1234", "title": "A Really Cool Item Title", ... },
	...
]
[
	{ "id": "1234", "name": [ "Galahad", "", "Sir" ], ... },
	...
]
```

For KonOpas compatibility, each array may optionally be wrapped as `var program = [ ... ];` / `var people = [ ... ];`. The variable name and the trailing semicolon are ignored — ConClár only looks at what's inside the square brackets, and only cares about the order (program before people) when a file contains both. This wrapper is entirely optional; a bare array works too.

---

## Program Array

```javascript
[
	{
		"id": "112eeabc-ef56-4197-9191-ce2aa3aea38e",
		"title": "A Really Cool Item Title",
		"tags": [
			{ "value": "tag01", "label": "Some track" },
			{ "value": "tag02", "label": "Another track" }
		],
		"datetime": "2013-12-24T14:30:00+00:00",
		"mins": "90",
		"loc": [ "Some Room", "Some Area" ],
		"people": [
			{ "id": "bf871858-39d4-4eeb-9f5f-611112262a9c", "role": "moderator" },
			{ "id": "837debde-9b9b-48ef-97f0-0c73002a398e" }
		],
		"desc": "Every prögrammé item really ought to have an explanation, unless it's really evident from the title itself what it'll be about.",
		"links": []
	},
	{
		"id": "29f103c8-d492-49c6-a971-6a4a69fe49ff",
		"title": "An Interview with the Knight of Honour",
		"tags": [
			{ "value": "tag01" },
			{ "value": "tag03", "category": "Track", "label": "Art" },
			{ "value": "tag04", "category": "Division", "label": "Program" },
			{ "value": "tag05", "category": "Tag", "label": "GoH" },
			{ "value": "tag06", "category": "Tag", "label": "Another tag" }
		],
		"datetime": "2013-12-25T23:30:00+00:00",
		"mins": "45",
		"loc": [ "Another Room", "Some Area" ],
		"people": [
			{ "id": "972cf921-4831-4b16-a189-b5f1072ab950", "role": "moderator" },
			{ "id": "bf871858-39d4-4eeb-9f5f-611112262a9c" }
		],
		"desc": "",
		"links": {
			"signup": "http://url.to.signup/",
			"meeting": "http://url.to.meeting/",
			"recording": "http://url.to.recording/"
		}
	},
	...
]
```

* `id` is a unique id to a programme item. This id is referred to by the `prog` field in the `people` array. There is no particular format it has to follow as long as each entry is unique.
* `title` is the title of the programme item.
* `tags` may include any number of programme tracks or other classifying indicators in this array.
    * May be a single string. String tags can have optional prefixes (such as "Track:" or "Division:") to split out the category of tag. This is the form used by KonOpas.
    * Alternatively, may be an object in the form `{ "value": "tag ID", "category": "tag category", "label": "label to display" }`. `category` is optional. If using this form, the category and label need only be specified once, and subsequent references to the tag need only specify the `value`.
* `format` optional field used by Grenadine. Treated as a `tag` if present.
* `date` is the date of when the item will happen. Used together with `time` as a KonOpas-compatible alternative to `datetime`. It assumes that the timezone of the item is the same as the server.
* `time` is the time of when the programme item will start, used together with `date`. It assumes that the timezone of the item is the same as the server.
* `datetime` is the date and time combined into a single field, in the format "YYYY-MM-DDThh:mm:ss". It may include an explicit timezone, such as, "YYYY-MM-DDThh:mm:ss+00:00", which will take precedence over the event timezone. If timezone not provided, time is presumed to be in event timezone. This is an alternative to specifying `date` and `time` separately.
* `mins` is the duration of the programme item in minutes.
    * Note: In order to avoid complications related to programme items that go on past midnight, or which have a starting time past midnight, is to include `time` for the start time and use `mins` for the duration in minutes (with 0 for unknown or n/a).
* `loc` is the location of the programme item. There can be multiple items in this array.
* `people` is an array that contains a list of the people assigned to the programme item. Each person is an array, containing `id` (required), `name` (optional) and `role` (optional). If `name` is omitted, it will get replaced by reference to the full `people` record when the file is loaded — this is the recommended form, to avoid keeping a name in two places. If provided directly (the KonOpas-compatible form), it's used as-is. The `role` item, if present, is checked for "Moderator" or "moderator" and used to set the moderator flag. The `name` item is also checked for "(moderator)" and will set the moderator flag.
* `desc` is a description of the programme item.
    * Note: The fields `desc` for program.js and `bio` for people.js can support HTML tags, which are not supported elsewhere.
* `links` is an array that contains a set of url links for the programme item. Currently, `signup`, `meeting` and `recording` are the valid link types.

Note: these fields are not mutually exclusive between conventions, and it is possible to mix them within a file — for instance, one item could use `datetime` while another uses `date`/`time`. However, if compatibility with KonOpas is required, use the KonOpas forms throughout (`date`/`time`, string tags, inline `name`).


## People Array

```javascript
[
	{
		"id": "837debde-9b9b-48ef-97f0-0c73002a398e",
		"name": [ "Friend Andhis Jr." ],
		"sortname" : "Andhis Jr., Friend",
		"tags": [],
		"prog": [ "1234", "614", "801" ],
		"links": [],
		"bio": "Prior art for Adams's satirical point – that humans attach such importance to their automobiles that a visiting extraterrestrial might reasonably mistake them for the planet's dominant life form – can be found in a widely reprinted article from <i>The Rockefeller Institute Review</i> titled <i>Life on Earth (by a Martian)</i> by Paul Weiss. The idea was also expounded by Carl Sagan, though this may have postdated Adams's creation of the character of Ford. The 1967 Oscar-nominated animated film <i>What on Earth!</i> from the National Film Board of Canada is also based on this premise."
	},
	{
		"id": "972cf921-4831-4b16-a189-b5f1072ab950",
		"name": [ "Galahad", "", "Sir" ],
		"sortname": "Sir Galahad",
		"tags": [ {"value": "G1", "label": "GoH"} ],
		"prog": [ "416" ],
		"links": {
			"img": "/images/galahad.jpg",
			"photo": "/images/galahad.jpg",
			"img_256_url": "/images/galahad.jpg",
			"url": "http://en.wikipedia.org/wiki/Galahad"
		},
		"bio": "Sir Galahad (/ˈɡæləhæd/; Middle Welsh: Gwalchavad, sometimes referred to as Galeas /ɡəˈliːəs/ or Galath /ˈɡæləθ/), in Arthurian legend, is a knight of King Arthur's Round Table and one of the three achievers of the Holy Grail."
	},
	{
		"id": "bf871858-39d4-4eeb-9f5f-611112262a9c",
		"name": [ "Just", "Sömeguy" ],
		"sortname": "Sömeguy Just",
		"tags": [ {"value": "v1", "label": "Virtual" } ],
		"prog": [ "1234", "416", "810" ],
		"links": {
			"twitter": "justsomeguy9999",
			"url": "http://example.com/just-someguys-blog"
		},
		"bio": "He was voted \"Worst Dressed Sentient Being in the Known Universe\" seven consecutive times. He's been described as \"the best Bang since the Big One\" by Eccentrica Gallumbits, and as \"one hoopy frood\" by others. In the seventh episode of the original radio series, the narrator describes Beeblebrox as being the \"owner of the hippest place in the universe\" (his own left cranium), as voted on in a poll of the readers of the fictional magazine Playbeing."
	},
	...
]
```

* `id` is a unique id to a people item. This id is referenced by the `people` field in the `program` array.
* `name` is the name of the person. It can be an array in the following format: [ "First", "Last", "Prefix", "Suffix" ] or as [ "Full Name" ].
    *Note: The name field a different field in program.js's `people` and in people.js; in the former it's ready to print whereas in the latter it's an array [ "First", "Last", "Prefix", "Suffix" ] with fields possibly left as empty strings or left out completely.
* `sortname` is an alternate sort for the name field.
* `tags` work exactly like they do for program items. Can be either the KonOpas-compatible string form or the object form, and can use categories.
* `prog` is an array of programme ids to which the person is assigned.
* `links` is an array of items for the person. Currently implemented links are:
    * `img` - a link which is a path to a thumbnail image of the person;
    * `photo` - a link which is a path to a thumbnail image of the person;
    * Other links will be displayed as icons under bio. Known link types are: `twitter`, `fb`, `facebook`, `instagram`, `twitch`, `youtube`, `tiktok`, `linkedin`, `website`, and will be shown with a suitable icon. A generic link icon will be used for other link types.
* `img_256_url` - a link which is a path to a thumbnail image of the person (used by Grenadine). Note this is in the root level of the `people` record, not under `links`.
* `bio` is the biography of the person.
    * Note: The fields `desc` for program.js and `bio` for people.js can support HTML tags, which get sanitized for dangerous HTML, but all other fields must be plain text.
