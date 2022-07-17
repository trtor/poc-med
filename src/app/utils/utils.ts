import { resolve } from "path";

export const ttlSec = 60 * 60 * 24 * 7; // 7 days

export const csvPath = (name: string): string => resolve(__dirname, "../../../csv", `${name}.csv`);

export const rediSearchEscapeChar = [
  ",",
  ".",
  "<",
  ">",
  "{",
  "}",
  "[",
  "]",
  '"',
  "'",
  ":",
  ";",
  "!",
  "@",
  "#",
  "$",
  "%",
  "^",
  "&",
  "*",
  "(",
  ")",
  "-",
  "+",
  "=",
  "~",
];

export function escapeCharacters(str: unknown): string | undefined {
  const specialChars = rediSearchEscapeChar;
  if (!str || typeof str !== "string") return undefined;
  let result = "";
  for (let i = 0; i < str.length; i++) {
    if (specialChars.includes(str[i])) {
      result += `\\${str[i]}`;
    } else {
      result += str[i];
    }
  }
  return result;
}
