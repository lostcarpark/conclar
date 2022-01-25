# ConClár Data Structure

This is a document defining the data structures to be used with ConClár, i.e. the format for the JSON-formatted files that make up the programme database. These file(s) will need to define up to two variables: program and people.

This layout is based on the layout used for KonOpas and should be backward compatible with it (Ie. An export created for KonOpas should work fine in ConClár).  [KonOpas Data Formats](https://konopas.github.io/data-fmt)

This is a work in progress, so stuff may still change at any time.

---

## Program Object

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
			{ "id": "2345", "name": "Just Sömeguy" },
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
			{ "id": "1234", "name": "Sir Galahad" },
			{ "id": "2345", "name": "Just Sömeguy" }
		],
		"desc": "",
		"links": [
			"meeting": "http://url.to,meeting/",
			"recording": "http://url.to.recording/"
		]
	},
	...
];
```
`id` is a unique id to a programme item. This id is referred to by the `prog` field in the `people` array.

`title` is the title of the programme item.

`tags` may include any number of programme tracks or other classifying indicators in this array. These different tags can have prefixes (such as "Track:" or "Division:" to split out the type of tag.

`date` is the date of when the item will happen.

`time` is the time of when the programme item will start. It assumes that the timezone of the item is the same as the server.

`mins` is the duration of the programme item in minutes.

Note: In order to avoid complications related to programme items that go on past midnight, or which have a starting time past midnight, is to include `time` for the start time and use `mins` for the duration in minutes (with 0 for unknown or n/a).

`loc` is the location of the programme item. There can be multiple items in this array.

`people` is an array that contains a list of the people assigned to the programme item. It contains the `id` from the people array and the "ready to print" format of the person's name.

`desc` is a description of the programme item.

Note: The fields `desc` for program.js and `bio` for people.js can support HTML tags, which are not supported elsewhere.

`links` is an array that contains a set of url links for the programme item. Currently, `meeting` and `recording` are the valid link types.


## People Object

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
		"links": [
			"img": "/images/galahad.jpg",
			"photo": "/images/galahad.jpg",
			"img_256_url": "/images/galahad.jpg",
			"url": "http://en.wikipedia.org/wiki/Galahad"
		],
		"bio": "Sir Galahad (/ˈɡæləhæd/; Middle Welsh: Gwalchavad, sometimes referred to as Galeas /ɡəˈliːəs/ or Galath /ˈɡæləθ/), in Arthurian legend, is a knight of King Arthur's Round Table and one of the three achievers of the Holy Grail."
	},
	{
		"id": "2345",
		"name": [ "Just", "Sömeguy" ],
		"sortname": "Sömeguy Just",
		"tags": [],
		"prog": [ "1234", "416", "810" ],
		"links": [
			"twitter": "justsomeguy9999",
			"url": "http://example.com/just-someguys-blog"
		],
		"bio": "He was voted \"Worst Dressed Sentient Being in the Known Universe\" seven consecutive times. He's been described as \"the best Bang since the Big One\" by Eccentrica Gallumbits, and as \"one hoopy frood\" by others. In the seventh episode of the original radio series, the narrator describes Beeblebrox as being the \"owner of the hippest place in the universe\" (his own left cranium), as voted on in a poll of the readers of the fictional magazine Playbeing."
	},
	...
];
```
`id` is a unique id to a people item. This id is referenced by the `people` field in the `program` array.

`name` is the name of the person. It can be an array in the following format: [ "First", "Last", "Prefix", "Suffix" ] or as [ "Full Name" ].

Note: The name field a different field in program.js’s `people` and in people.js; in the former it’s ready to print whereas in the latter it’s an array [ "First", "Last", "Prefix", "Suffix" ] with fields possibly left as empty strings or left out completely.

`sortname` is an alternate sort for the name field.

`tags` is NOT CURRENTLY IMPLEMENTED for ConClár.

`prog` is an array of programme ids to which the person is assigned.

`links` is an array of items for the person. 

Currently implemented links are:
- `img` - a link which is a path to a thumbnail image of the person;
- `photo` - a link which is a path to a thumbnail image of the person;
- `img_256_url` - a link which is a path to a thumbnail image of the person (used by Grenadine).

`bio` is the biography of the person.

Note: The fields `desc` for program.js and `bio` for people.js can support HTML tags, which may not be supported elsewhere (though they’ll probably be fine).

