import type { Request, Response } from "express";
import type { MasterTableName } from "../init-data/table-list";
import type { MedMasterParams } from "../interfaces/med-api-path";
import type { MedicationMasterCsv } from "../interfaces/med-api-redis-model";
import type { MedicationMasterErrorResponse, MedicationMasterOkResponse } from "../interfaces/med-api-response";
import redis from "../redis/redis-con";
import { ftIdxName } from "../redis/redis-key";

export async function searchMedicationMaster(
  req: Request<unknown, unknown, unknown, MedMasterParams>,
  res: Response<MedicationMasterOkResponse | MedicationMasterErrorResponse>
): Promise<Response> {
  const { s: searchKey } = req.query;
  if (typeof searchKey !== "string" || !searchKey?.trim())
    return res.status(400).json({ status: 400, message: "Invalid search param" });

  try {
    // TODO: Validate input allow some characters
    // Allow * then replace to empty string
    const result = await ftSearchQuery<MedicationMasterCsv>("MEDICATION_MASTER", searchKey?.trim());
    return res.status(200).json({ status: 200, payload: result.data });
  } catch (error) {
    return res.status(400).json({ status: 500, message: (error as Error)?.message, error });
  }
}

async function ftSearchQuery<T extends Record<string, string | null>>(
  table: keyof typeof MasterTableName,
  searchKey: string,
  limit = 50
): Promise<FtsResult<T>> {
  if (!searchKey?.length) return { data: [], rowCount: 0 };
  const idxName = ftIdxName({ table });
  const termList = searchKey
    .replace(/\s\s+/g, " ")
    .split(" ")
    .filter(str => str.length > 1); // Default RedisSearch config min length = 2

  const restTerms = termList.splice(1);
  const keyword = `*${termList[0]}* ` + restTerms.join("* ") + (restTerms.length ? "*" : "");

  const searchResult = (await redis.call("FT.SEARCH", idxName, keyword, "LIMIT", 0, limit)) as (
    | number
    | string
    | string[]
  )[];
  return transformSearchResult<T>(searchResult);
}

export function transformSearchResult<T extends Record<string, string | number | null>>(
  result: (number | string | string[])[]
): FtsResult<T> {
  const [count, ...keyValue] = result;
  if (typeof count !== "number") throw { message: "Invalid search result, key 0" };
  if (keyValue.length % 2 !== 0) throw { message: "Invalid search result, redisKey-value, not in pair" };

  const value = keyValue.filter((v, i): v is string[] => Array.isArray(v) && i % 2 === 1);

  const data = value.map<T>(v => {
    if (v.length % 2 !== 0) throw { message: "Invalid search result, objectKey-value, not in pair" };
    const resultKeyValue: [string, string | null][] = [];
    for (let i = 0; i < v.length; i += 2) {
      resultKeyValue.push([v[i], v[i + 1] || null]);
    }
    return Object.fromEntries(resultKeyValue) as T;
  });

  return { rowCount: count, data };
}

export type FtsResult<T> = { rowCount: number; data: T[] };
