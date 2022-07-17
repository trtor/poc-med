import { resolve } from "path";

export const ttlSec = 60 * 60 * 24 * 7; // 7 days

export const csvPath = (name: string): string => resolve(__dirname, "../../../csv", `${name}.csv`);

export const rediSearchEscapeChar: string[] = [
  [",", ".", "<", ">", "{", "}", "[", "]", '"', "'", ":", ";", "!", "@"],
  ["#", "$", "%", "^", "&", "*", "(", ")", "-", "+", "=", "~"],
].flat();

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

export function removeDuplicateByKeys<T extends Record<string, unknown>>(data: T[], keys: (keyof T & string)[]): T[] {
  const keySet = new Set();
  const result: T[] = [];
  for (const d of data) {
    const setStr = keys.reduce((acc, key) => {
      const value = d[key];
      if (value && typeof value === "string") acc += value;
      return acc;
    }, "");
    if (!keySet.has(setStr)) {
      keySet.add(setStr);
      result.push(d);
    }
  }
  return result;
}
