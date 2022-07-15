import { resolve } from "path";

export const ttlSec = 60 * 60 * 24;

export const csvPath = (name: string): string => resolve(__dirname, "../../../csv", `${name}.csv`);
