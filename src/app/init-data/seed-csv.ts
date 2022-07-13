/* eslint-disable no-await-in-loop */
import { parseFile } from "@fast-csv/parse";
import Redis from "ioredis";
import { resolve } from "path";
import redis from "../redis/redis-con";
import { ftIdxName, redisKey } from "../redis/redis-key";
import { sliceIntoChunks } from "../utils/slice-chunks";
import type { DrugMasterUsageCsv, MedicationMasterCsv } from "./interface";
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
  await readWriteRedis<MedicationMasterCsv>(["MEDICATION_MASTER"], "id", [
    ["id", "TAG"],
    ["name", "TEXT", "NOSTEM", "WEIGHT", "5.0"],
    ["strength", "TEXT", "NOSTEM", "WEIGHT", "1.0"],
    ["unit", "TEXT", "NOSTEM", "WEIGHT", "1.0"],
  ]);
  await readWriteRedis<DrugMasterUsageCsv>(["DRUG_MASTER_USAGE"], "drug_master_usage_id");
}

async function readWriteRedis<T extends ParseRow>(
  nameList: (keyof typeof MasterTableName)[],
  pkName: keyof T,
  indexTable: string[][] = []
): Promise<void> {
  for (const name of nameList) {
    const chunkResponse: number[] = [];
    const indexName = ftIdxName({ table: name });
    const info = (await redis.call("FT.INFO", indexName).catch(() => undefined)) as (string | string[])[] | undefined;
    if (info?.[1] === indexName) await redis.call("FT.DROPINDEX", indexName);
    if (indexTable.length) {
      await redis.sendCommand(
        new Redis.Command(
          "FT.CREATE",
          [indexName, `ON`, `HASH`, `PREFIX`, `1`, `${redisKey({ table: name })}`, "SCHEMA", ...indexTable.flat()],
          { replyEncoding: "utf-8" }
        )
      );
    }
    const readMaster = await readCsv<T>(csvPath(MasterTableName[name]));
    console.log(name, "read-csv", readMaster.rowCount);
    const chunkGroup = sliceIntoChunks(readMaster.data, 5000);
    for (const chunk of chunkGroup) {
      // redis.hset
      await Promise.all(
        chunk.map(async row => {
          const key = redisKey({ table: name, pk: row[pkName] as string });
          const writeRes = await redis.hset(key, row);
          await redis.expire(key, ttlSec);
          return writeRes;
        })
      );
      chunkResponse.push(chunk.length);
    }
    console.log(name, "insert-chunk", chunkResponse.join("-"), "\n");
  }
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
