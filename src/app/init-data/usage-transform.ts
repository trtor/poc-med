import { csvPath } from "../utils/utils";
import type { DrugMasterUsageCsv, DrugUsageGlobalCsv, MedicationMasterCsv, MedicationUsageCsv } from "./interface";
import { readCsv } from "./seed-csv";
import { MasterTableName } from "./table-list";

export async function drugUsageImport() {
  const readMedicationUsage = readCsv<MedicationUsageCsv>(csvPath(MasterTableName["MEDICATION_MASTER"]));
  const readDrugMasterUsageRelation = readCsv<DrugMasterUsageCsv>(csvPath(MasterTableName["DRUG_MASTER_USAGE"]));
  const readMedicationMaster = readCsv<MedicationMasterCsv>(csvPath(MasterTableName["MEDICATION_MASTER"]));
  const readDrugUsageGlobal = readCsv<DrugUsageGlobalCsv>(csvPath(MasterTableName["DRUG_USAGE_GLOBAL"]));

  const [medicationUsage, drugMasterUsageRelation, medicationMaster, drugUsageGlobal] = await Promise.all([
    readMedicationUsage,
    readDrugMasterUsageRelation,
    readMedicationMaster,
    readDrugUsageGlobal,
  ]);

  console.log(
    medicationUsage.rowCount,
    drugMasterUsageRelation.rowCount,
    medicationMaster.rowCount,
    drugUsageGlobal.rowCount
  );
}
