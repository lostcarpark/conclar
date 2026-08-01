import fs from "fs";

export function readConfig(configPath) {
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}
