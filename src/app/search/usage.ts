import type { Request, Response } from "express";
import type { MedicationUsageDenormalized } from "../init-data/interface";
import { medicationUsageRegimen } from "../init-data/medication-usage-regimen.enum";
import redis from "../redis/redis-con";
import { ftIdxName } from "../redis/redis-key";
import { escapeCharacters, rediSearchEscapeChar } from "../utils/utils";
import { FtsResult, transformSearchResult } from "./medication";

// /usage
export async function searchMedUsage(
  req: Request<unknown, unknown, unknown, { id?: string; s?: string }>,
  res: Response
): Promise<Response> {
  const { id: medId, s: searchKey } = req.query;

  if (typeof searchKey !== "string" || !searchKey?.trim())
    return res.status(400).json({ message: "Invalid search param" });
  try {
    await Promise.resolve(null);
    const result = await ftsUsage(searchKey.trim(), medId?.trim());
    return res.json(result);
  } catch (error) {
    console.error(error);
  }

  return res.status(200);
}

async function ftsUsage(
  searchKey: string,
  medId?: string,
  limit = 50
): Promise<FtsResult<MedicationUsageDenormalized>> {
  if (!searchKey?.length) return { data: [], rowCount: 0 };
  const idxName = ftIdxName({ table: "MEDICATION_USAGE_DENORMALIZED" });

  const termList = searchKey.replace(/\s\s+/g, " ").split(" ");

  // Medication usage regimen: 'O', 'SC', 'RN', 'EC', 'NB',
  const usageRegimen = termList.filter(e => medicationUsageRegimen.includes(e.toUpperCase()));
  const regimenTag = usageRegimen.map(e => e.toUpperCase()).join("|");

  const termWithEscapeList = termList
    .filter(e => rediSearchEscapeChar.some(redisEscape => e.includes(redisEscape)))
    .map(e => escapeCharacters(e))
    .filter((e): e is string => !!e);
  const escapeKeyword = termWithEscapeList.length ? termWithEscapeList.map(e => `${e}*`).join(" ") : "";

  const searchTerm = termList
    .filter(e => rediSearchEscapeChar.every(redisEscape => !e.includes(redisEscape)))
    .filter(str => str.length > 1); // Default RedisSearch config min length = 2

  let keyword = searchTerm.map(e => `${e}*`).join(" ");

  if (termWithEscapeList.length) {
    keyword += " " + escapeKeyword;
  }

  if (usageRegimen.length) {
    const columnRegimen: keyof MedicationUsageDenormalized = "REGIMEN_CODE_HX";
    keyword += ` @${columnRegimen}:{${regimenTag}}`;
  }

  const addSort: ["SORTBY", keyof MedicationUsageDenormalized, "ASC" | "DESC"][] = [];
  if (medId) {
    const medMasterId: keyof MedicationUsageDenormalized = "medication_master_id";
    const matchMedIdFormFlag: keyof MedicationUsageDenormalized = "match_med_id_and_form";
    addSort.push(["SORTBY", "match_med_id_and_form", "DESC"]);
    keyword += ` @${medMasterId}:{${medId}|__NULL__}`;
    keyword += ` ~@${medMasterId}:{${medId}}`;
    keyword += ` ~@${matchMedIdFormFlag}:{1}`;
  }

  const searchResult = (await redis.call(
    "FT.SEARCH",
    idxName,
    keyword.trim(),
    ...addSort.flat(),
    "LIMIT",
    0,
    limit
  )) as (number | string | string[])[];

  console.log({ termList, termWithEscape: termWithEscapeList, keyword });

  return transformSearchResult<MedicationUsageDenormalized>(searchResult);
}
