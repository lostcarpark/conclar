export class JsonParse {
  static extractJson(data, start = 0) {
    const chars = [...data];
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

    for (let curPos = start; curPos < chars.length; curPos++) {
      let curChar = chars[curPos];
      if (prevChar !== "\\") {
        switch (curChar) {
          case "/":
            let nextChar = chars[curPos + 1];
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
            break;
          case "}":
            if (!inSingleQuote && !inDoubleQuote) {
              objectLevel--;
            }
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
            break;
          case "]":
            if (!inSingleQuote && !inDoubleQuote) {
              arrayLevel--; // Decrease array level.
            }
            break;
          default:
            break;
        }
      }
      // If we're inside an entity, add character (unless inside comment), then check if end of entity.
      if (inEntity && !inLineComment && !inBlockComment) {
        json += curChar;
        if (objectLevel === 0 && arrayLevel === 0) {
          // No longer in entity, so push to entities array, and reset json string.
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

    return jsonEntities;
  }
}
