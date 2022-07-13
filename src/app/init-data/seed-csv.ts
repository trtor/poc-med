/* eslint-disable no-await-in-loop */
import { parseFile } from "@fast-csv/parse";
import Redis from "ioredis";
import { resolve } from "path";
import redis from "../redis/redis-con";
import { ftIdxName, redisKey } from "../redis/redis-key";
import { sliceIntoChunks } from "../utils/slice-chunks";
import type {
  AllCsvTypes,
  DrugMasterUsageCsv,
  DrugUsageGlobalCsv,
  MedicationMasterCsv,
  MedicationUsageCsv,
} from "./interface";
import { MasterTableName } from "./table-list";

const ttlSec = 60 * 60 * 24;
const csvPath = (name: string): string => resolve(__dirname, "../../../csv", `${name}.csv`);

export async function seedMasterData(): Promise<void> {
  const keyList = await redis.keys(redisKey() + "*");
  if (keyList.length) {
    await redis
      .del(keyList)
      .then(() => console.log("Removed key with prefix ", redisKey(), " length:", keyList.length));
    await new Promise(r => {
      setTimeout(r, 1000);
    });
  }
  await readWriteRedis<MedicationMasterCsv>("MEDICATION_MASTER", "id", [
    ["id", "TAG"],
    ["name", "TEXT", "NOSTEM", "WEIGHT", "5.0"],
    ["strength", "TEXT", "NOSTEM", "WEIGHT", "1.0"],
    ["unit", "TEXT", "NOSTEM", "WEIGHT", "1.0"],
    ["dosage_form", "TEXT", "NOSTEM", "WEIGHT", "1.0"],
  ]);
  await readWriteRedis<DrugMasterUsageCsv>("DRUG_MASTER_USAGE", "drug_master_usage_id", [
    ["drug_master_id", "TAG"],
    ["drug_master_usage_id", "TAG"],
  ]);
  await readWriteRedis<MedicationUsageCsv>("MEDICATION_USAGE", "id", [
    ["id", "TEXT", "NOSTEM"],
    ["code", "TEXT", "NOSTEM", "WEIGHT", "5.0"],
    ["display_line_1", "TEXT", "NOSTEM", "WEIGHT", "1.0"],
    ["display_line_2", "TEXT", "NOSTEM", "WEIGHT", "1.0"],
    ["display_line_3", "TEXT", "NOSTEM", "WEIGHT", "1.0"],
    ["REGIMEN_CODE_HX", "TAG"],
  ]);
  await readWriteRedis<DrugUsageGlobalCsv>("DRUG_USAGE_GLOBAL", "drug_usage_id", [
    ["drug_usage_id", "TAG"],
    ["dosage_form", "TEXT", "NOSTEM"],
  ]);
}

async function readWriteRedis<T extends AllCsvTypes>(
  TableEnum: keyof typeof MasterTableName,
  pkName: keyof T & string,
  indexTable: [keyof T & string, FieldTypes, ...(FieldOptions | string)[]][] = []
): Promise<void> {
  const chunkResponse: number[] = [];
  const indexName = ftIdxName({ table: TableEnum });
  const info = (await redis.call("FT.INFO", indexName).catch(() => undefined)) as (string | string[])[] | undefined;
  if (info?.[1] === indexName) await redis.call("FT.DROPINDEX", indexName);
  if (indexTable.length) {
    await redis.sendCommand(
      new Redis.Command(
        "FT.CREATE",
        [indexName, `ON`, `HASH`, `PREFIX`, `1`, `${redisKey({ table: TableEnum })}`, "SCHEMA", ...indexTable.flat()],
        { replyEncoding: "utf-8" }
      )
    );
  }
  const readMaster = await readCsv<T>(csvPath(MasterTableName[TableEnum]));
  console.log(TableEnum, "read-csv", readMaster.rowCount);
  const chunkGroup = sliceIntoChunks(readMaster.data, 5000);
  for (const chunk of chunkGroup) {
    await Promise.all(
      chunk.map(async row => {
        const key = redisKey({ table: TableEnum, pk: row[pkName] as unknown as string });
        const writeRes = await redis.hset(key, row);
        await redis.expire(key, ttlSec);
        return writeRes;
      })
    );
    chunkResponse.push(chunk.length);
  }
  console.log(TableEnum, "insert-chunk", chunkResponse.join("-"), "\n");
}

async function readCsv<T extends ParseRow>(filePath: string): Promise<ReadCsvResponse<T>> {
  return new Promise<ReadCsvResponse<T>>((resolve, reject) => {
    const readData: T[] = [];
    parseFile<ParseRow, ParseRow>(filePath, { headers: true, trim: true })
      .transform((data: ParseRow) =>
        // Transform empty string to null
        Object.keys(data).reduce<ParseRow>((acc, key) => {
          acc[key] = replaceNull(data[key]);
          return acc;
        }, {})
      )
      .on("data", (row: T): void => {
        readData.push(row);
      })
      .on("error", error => reject(error))
      .on("end", (rowCount: number) => {
        resolve({
          data: readData,
          rowCount,
        });
      });
  });
}

function replaceNull(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "NULL" || trimmed === "-") return null;
  return trimmed;
}

type ParseRow = Record<string, string | null>;

type ReadCsvResponse<T extends ParseRow> = { data: T[]; rowCount: number };

type FieldTypes = "TEXT" | "TAG" | "NUMERIC" | "GEO" | "VECTOR";
type FieldOptions =
  | "SORTABLE"
  | "UNF"
  | "NOSTEM"
  | "NOINDEX"
  | "PHONETIC"
  | "WEIGHT"
  | "SEPARATOR"
  | "CASESENSITIVE"
  | "WITHSUFFIXTRIE";
