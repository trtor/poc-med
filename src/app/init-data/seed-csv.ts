/* eslint-disable no-await-in-loop */
import { parseFile } from "@fast-csv/parse";
import Redis from "ioredis";
import redis from "../redis/redis-con";
import { ftIdxName, redisKey } from "../redis/redis-key";
import { sliceIntoChunks } from "../utils/slice-chunks";
import { csvPath, ttlSec } from "../utils/utils";
import type {
  AllCsvTypes,
  DrugMasterUsageCsv,
  DrugUsageGlobalCsv,
  MedicationMasterCsv,
  MedicationUsageCsv,
} from "./interface";
import { MasterTableName } from "./table-list";
import { drugUsageImport } from "./usage-transform";

export async function seedMasterData(): Promise<void> {
  const keyList = await redis.keys(redisKey() + "*");
  if (keyList.length) {
    await redis
      .del(keyList)
      // eslint-disable-next-line no-console
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

  // Transform medication usage into new table
  await drugUsageImport();
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
  // eslint-disable-next-line no-console
  console.log(TableEnum, "read-csv", readMaster.rowCount);
  await saveRedisChunk(TableEnum, pkName, readMaster.data);
  // eslint-disable-next-line no-console
  console.log(TableEnum, "insert-chunk", chunkResponse.join("-"), "\n");
}

async function saveRedisChunk<T extends AllCsvTypes>(
  TableEnum: keyof typeof MasterTableName,
  pkName: keyof T & string,
  data: T[]
): Promise<number[]> {
  const chunkResponse: number[] = [];
  const chunkGroup = sliceIntoChunks(data, 5000);
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
  return chunkResponse;
}

export async function readCsv<T extends ParseRow>(filePath: string): Promise<ReadCsvResponse<T>> {
  return new Promise<ReadCsvResponse<T>>((resolve, reject) => {
    const readData: T[] = [];
    parseFile<ParseRow, ParseRow>(filePath, { headers: true, trim: true })
      .transform((data: ParseRow) =>
        // Transform empty string to undefined
        Object.keys(data).reduce<ParseRow>((acc, key) => {
          acc[key] = replaceUndefined(data[key]);
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

function replaceUndefined(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "NULL" || trimmed === "-") return undefined;
  return trimmed;
}

type ParseRow = Record<string, string | null | undefined>;

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
