# ConClár Data Structure

This is a document defining the data structures to be used with ConClár, i.e. the format for the JSON-formatted files that make up the programme database. These file(s) will need to define up to two variables: program and people.

This layout is based on the layout used for KonOpas and should be backward compatible with it (Ie. An export created for KonOpas should work fine in ConClár).  [KonOpas Data Formats](https://konopas.github.io/data-fmt)

This is a work in progress, so stuff may still change at any time.

---

## Program Object

### Old style - KonOpas compatible.

```javascript
var program = [
	{
		"id": "1234",
		"title": "A Really Cool Item Title",
		"tags": [ "Some track", "Another track" ],
		"date": "2013-12-24",
		"time": "14:30",
		"mins": "90",
		"loc": [ "Some Room", "Some Area" ],
		"people": [
			{ "id": "2345", "name": "Just Sömeguy", "role": "moderator" },
			{ "id": "4567", "name": "Andhis Friend, Jr." }
		],
		"desc": "Every prögrammé item really ought to have an explanation, unless it's really evident from the title itself what it'll be about.",
		"links": []
	},
	{
		"id": "416",
		"title": "An Interview with the Knight of Honour",
		"tags": [ "Track: Art", "Division: Program", "Tag: GoH", "Tag: Another tag" ],
		"date": "2013-12-25",
		"time": "23:30",
		"mins": "45",
		"loc": [ "Another Room", "Some Area" ],
		"people": [
			{ "id": "1234", "name": "Sir Galahad (moderator)" },
			{ "id": "2345", "name": "Just Sömeguy" }
		],
		"desc": "",
		"links": {
			"signup": "http://url.to.signup/",
			"meeting": "http://url.to.meeting/",
			"recording": "http://url.to.recording/"
		}
	},
	...
];
```

### New style - not KonOpas compatible.

```javascript
[
	{
		"id": "112eeabc-ef56-4197-9191-ce2aa3aea38e",
		"title": "A Really Cool Item Title",
		"tags": [ "Some track", "Another track" ],
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
		"tags": [ "Track: Art", "Division: Program", "Tag: GoH", "Tag: Another tag" ],
		"date": "2013-12-25T23:30:00+00:00",
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

* `var program =` and the trailing semicolon are completely optional. They were needed by KonOpas, but ConClár ignores everything outside square brackets. `program` must be the first array in the file if multiple entries in file (discouraged).
* `id` is a unique id to a programme item. This id is referred to by the `prog` field in the `people` array. There is no particular format it has to follow as long as each entry is unique.
* `title` is the title of the programme item.
* `tags` may include any number of programme tracks or other classifying indicators in this array. These different tags can have prefixes (such as "Track:" or "Division:" to split out the type of tag.
* `format` optional field used by Grenadine. Treated as a `tag` if present.
* `date` is the date of when the item will happen.
* `time` is the time of when the programme item will start. It assumes that the timezone of the item is the same as the server.
* `datetime` is the date and time combined into a single field, in the format "YYYY-MM-DDThh:mm:ss". It may include an explicit timezone, such as, "YYYY-MM-DDThh:mm:ss+00:00", which will take precenence over the event timezone. If timezone not provided, time is presumed to be in event timezone.
* `mins` is the duration of the programme item in minutes.
    * Note: In order to avoid complications related to programme items that go on past midnight, or which have a starting time past midnight, is to include `time` for the start time and use `mins` for the duration in minutes (with 0 for unknown or n/a).
* `loc` is the location of the programme item. There can be multiple items in this array.
* `people` is an array that contains a list of the people assigned to the programme item. Each person is an array, containing `id` (required), `name` (optional) and `role` (optional). If name is present, it will get replaced by reference to the full `people` record when the file is loaded. The `role` item, if present, is checked for "Moderator" and used to set the moderator flag. The `name` item is also checked for "(moderator)" and will set the moderator flag.
* `desc` is a description of the programme item.
    * Note: The fields `desc` for program.js and `bio` for people.js can support HTML tags, which are not supported elsewhere.
* `links` is an array that contains a set of url links for the programme item. Currently, `signup`, `meeting` and `recording` are the valid link types.


## People Object

### Old Style - KonOpas Compatible

```javascript
var people = [
	{
		"id": "4567",
		"name": [ "Friend Andhis Jr." ],
		"sortname" : "Andhis Jr., Friend",
		"tags": [],
		"prog": [ "1234", "614", "801" ],
		"links": [],
		"bio": "Prior art for Adams's satirical point – that humans attach such importance to their automobiles that a visiting extraterrestrial might reasonably mistake them for the planet's dominant life form – can be found in a widely reprinted article from <i>The Rockefeller Institute Review</i> titled <i>Life on Earth (by a Martian)</i> by Paul Weiss. The idea was also expounded by Carl Sagan, though this may have postdated Adams's creation of the character of Ford. The 1967 Oscar-nominated animated film <i>What on Earth!</i> from the National Film Board of Canada is also based on this premise."
	},
	{
		"id": "1234",
		"name": [ "Galahad", "", "Sir" ],
		"sortname": "Sir Galahad",
		"tags": [ "GoH" ],
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
		"id": "2345",
		"name": [ "Just", "Sömeguy" ],
		"sortname": "Sömeguy Just",
		"tags": [],
		"prog": [ "1234", "416", "810" ],
		"links": {
			"twitter": "justsomeguy9999",
			"url": "http://example.com/just-someguys-blog"
		},
		"bio": "He was voted \"Worst Dressed Sentient Being in the Known Universe\" seven consecutive times. He's been described as \"the best Bang since the Big One\" by Eccentrica Gallumbits, and as \"one hoopy frood\" by others. In the seventh episode of the original radio series, the narrator describes Beeblebrox as being the \"owner of the hippest place in the universe\" (his own left cranium), as voted on in a poll of the readers of the fictional magazine Playbeing."
	},
	...
];
```


### New Style - Not KonOpas Compatible

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
		"tags": [ "GoH" ],
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
		"tags": [],
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

* `var people =` and the trailing semicolon were required by KonOpas, but are optional for ConClár. Everything outside square brackets is ignored. If `program` and `people` are in a single file, `program` must come first. 
* `id` is a unique id to a people item. This id is referenced by the `people` field in the `program` array.
* `name` is the name of the person. It can be an array in the following format: [ "First", "Last", "Prefix", "Suffix" ] or as [ "Full Name" ].
    *Note: The name field a different field in program.js’s `people` and in people.js; in the former it’s ready to print whereas in the latter it’s an array [ "First", "Last", "Prefix", "Suffix" ] with fields possibly left as empty strings or left out completely.
* `sortname` is an alternate sort for the name field.
* `tags` is NOT CURRENTLY IMPLEMENTED for ConClár.
* `prog` is an array of programme ids to which the person is assigned.
* `links` is an array of items for the person.  Currently implemented links are:
    * `img` - a link which is a path to a thumbnail image of the person;
    * `photo` - a link which is a path to a thumbnail image of the person;
    * Not yet supported, but expect to be added soon: `url`, `fb`, and `twitter`.
* `img_256_url` - a link which is a path to a thumbnail image of the person (used by Grenadine). Note this is in the root level of the `people` record, not under `links`.
* `bio` is the biography of the person.
    * Note: The fields `desc` for program.js and `bio` for people.js can support HTML tags, which get sanitized for dangerous HTML, but all other fields must be plain text.

