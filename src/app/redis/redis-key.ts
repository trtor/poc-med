import env from "../environment";
import { MasterTableName } from "../init-data/table-list";

export function redisKey(option: { table?: keyof typeof MasterTableName; pk?: string } = {}): string {
  const { table, pk } = option;
  return `${env.appName}` + (table ? ":" + MasterTableName[table] : "") + (pk ? ":" + pk : "");
}

export function ftIdxName(option: { table?: keyof typeof MasterTableName } = {}): string {
  const { table } = option;
  return `idx-${env.appName}` + (table ? "-" + MasterTableName[table] : "");
}
