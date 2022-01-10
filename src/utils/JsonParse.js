export class JsonParse {
  static extractJson(data, start = 0) {
    //const strData = data.toString;
    let inEntity = false;
    let arrayLevel = 0;
    let objectLevel = 0;
    let inLineComment = false;
    let inBlockComment = false;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let jsonEntities = [];
    let prevChar = null;
    let json = "";

    for (let curPos = start; curPos < data.length; curPos++) {
      let curChar = data.charAt(curPos);
      switch (curChar) {
        case "\\":
          if (inEntity && !inLineComment && !inBlockComment) json += curChar;
          curPos++; // Escape character, so skip next character.
          break;
        case "/":
          let nextChar = data.charAt(curPos + 1);
          if (
            nextChar === "/" &&
            !inBlockComment &&
            !inSingleQuote &&
            !inDoubleQuote
          ) {
            inLineComment = true;
          }
          if (
            nextChar === "*" &&
            !inLineComment &&
            !inSingleQuote &&
            !inDoubleQuote
          ) {
            inBlockComment = true;
          }
          break;
        case ("\n", "\r"):
          inLineComment = false;
          break;
        case "'":
          if (inSingleQuote) {
            // In string, so closing quote.
            inSingleQuote = false;
            break;
          }
          if (!inDoubleQuote) inSingleQuote = true; // Opening quote.
          break;
        case '"':
          if (inDoubleQuote) {
            // In string already, so closing quote.
            inDoubleQuote = false;
            break;
          }
          if (!inSingleQuote) inDoubleQuote = true; // Opening quote.
          break;
        case "{":
          if (!inSingleQuote && !inDoubleQuote) {
            // Make sure not in string.
            if (!inEntity) {
              // If start of entity, note position.
              inEntity = true;
            }
            objectLevel++; // Increase object level to allow for nested objects.
          }
          //   console.log("Object: %d, Array: %d", objectLevel, arrayLevel)
          break;
        case "}":
          if (!inSingleQuote && !inDoubleQuote) {
            objectLevel--;
          }
          //   console.log("Object: %d, Array: %d", objectLevel, arrayLevel)
          break;
        case "[":
          if (!inSingleQuote && !inDoubleQuote) {
            // Make sure not in string.
            if (!inEntity) {
              // If start of entity, note position.
              inEntity = true;
            }
            arrayLevel++; // Increase array level to allow for nested arrays.
          }
          //   console.log("Object: %d, Array: %d", objectLevel, arrayLevel)
          break;
        case "]":
          if (!inSingleQuote && !inDoubleQuote) {
            arrayLevel--; // Decrease array level.
          }
          //console.log("Object: %d, Array: %d", objectLevel, arrayLevel)
          break;
        default:
          break;
      }
      // If we're inside an entity, add character (unless inside comment), then check if end of entity.
      if (inEntity && !inLineComment && !inBlockComment) {
        json += curChar;
        if (objectLevel === 0 && arrayLevel === 0) {
          // No longer in entity, so push to entities array, and reset json string.
          console.log(json);
          jsonEntities.push(JSON.parse(json));
          json = "";
          inEntity = false;
        }
      }
      // We need to process end comment after add char to json, so the closing "/" doesn't get added.
      if (
        prevChar === "*" &&
        curChar === "/" &&
        inBlockComment &&
        !inSingleQuote &&
        !inDoubleQuote
      ) {
        inBlockComment = false;
      }
      prevChar = curChar;
    }

    console.log(jsonEntities);
    return jsonEntities;
  }
}
