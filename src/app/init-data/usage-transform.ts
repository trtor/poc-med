import { v4 as uuidv4 } from "uuid";
import { csvPath } from "../utils/utils";
import type {
  DrugMasterUsageCsv,
  DrugUsageGlobalCsv,
  MedicationMasterCsv,
  MedicationUsageCsv,
  MedicationUsageExtended,
} from "./interface";
import { readCsv } from "./seed-csv";
import { MasterTableName } from "./table-list";

export async function drugUsageImport(): Promise<void> {
  const readMedicationUsage = readCsv<MedicationUsageCsv>(csvPath(MasterTableName["MEDICATION_USAGE"]));
  const readDrugMasterUsageRelation = readCsv<DrugMasterUsageCsv>(csvPath(MasterTableName["DRUG_MASTER_USAGE"]));
  const readMedicationMaster = readCsv<MedicationMasterCsv>(csvPath(MasterTableName["MEDICATION_MASTER"]));
  const readDrugUsageGlobal = readCsv<DrugUsageGlobalCsv>(csvPath(MasterTableName["DRUG_USAGE_GLOBAL"]));

  const [medicationUsage, drugMasterUsageRelation, medicationMaster, drugUsageGlobal] = await Promise.all([
    readMedicationUsage,
    readDrugMasterUsageRelation,
    readMedicationMaster,
    readDrugUsageGlobal,
  ]);

  // De-normalize table
  const medUsageDenormalized = medicationUsageMergeDenormalize(
    medicationUsage.data,
    drugMasterUsageRelation.data,
    medicationMaster.data,
    drugUsageGlobal.data
  );
  // eslint-disable-next-line no-console
  console.log("Medication Usage (denormalized)", medUsageDenormalized.length);
}

function medicationUsageMergeDenormalize(
  medicationUsageData: MedicationUsageCsv[],
  drugMasterUsageRelationData: DrugMasterUsageCsv[],
  medicationMasterData: MedicationMasterCsv[],
  drugUsageGlobalData: DrugUsageGlobalCsv[]
): MedicationUsageExtended[] {
  return medicationUsageData.flatMap<MedicationUsageExtended>(usage => {
    const medMasterRelationId = drugMasterUsageRelationData
      .filter(e => e.drug_master_usage_id === usage.id)
      .map(e => e.drug_master_id);
    const drugUsageGlobalRelationForm = drugUsageGlobalData
      .filter(e => e.drug_usage_id === usage.id)
      .map(e => e.dosage_form)
      .filter((e): e is string => !!e);
    const filterMedMasterDosageForm = medicationMasterData.filter(
      medMaster =>
        medMasterRelationId.includes(medMaster.id) &&
        !!medMaster.dosage_form &&
        drugUsageGlobalRelationForm.includes(medMaster.dosage_form)
    );

    const matchMedMasterIdAndDosageForm = filterMedMasterDosageForm.map<MedicationUsageExtended>(medMaster => ({
      ...usage,
      uuid: uuidv4(),
      medication_master_id: medMaster.id,
      dosage_form: medMaster.dosage_form,
      match_med_id_and_form: "1",
    }));
    const matchMedMasterId = medMasterRelationId.map<MedicationUsageExtended>(id => ({
      ...usage,
      uuid: uuidv4(),
      medication_master_id: id,
      dosage_form: undefined,
      match_med_id_and_form: "0",
    }));
    const matchGlobalDosageForm = drugUsageGlobalRelationForm.map<MedicationUsageExtended>(dosageForm => ({
      ...usage,
      uuid: uuidv4(),
      medication_master_id: undefined,
      dosage_form: dosageForm,
      match_med_id_and_form: "0",
    }));
    const originalMedicationUsage: MedicationUsageExtended = {
      ...usage,
      uuid: uuidv4(),
      medication_master_id: undefined,
      dosage_form: undefined,
      match_med_id_and_form: "0",
    };
    return [...matchMedMasterIdAndDosageForm, ...matchMedMasterId, ...matchGlobalDosageForm, originalMedicationUsage];
  });
}

/*

1st med-master key [pk] -> drug-master-usage-relation -> medication-usage

2nd med-master dosage_form -> drug-usage-global -> medication-usage

3rd med-usage 
- 1st weight: regimen_code_hn if length = 1 
  - (O = per oral)
- 2nd weight: code if length = 2
  - 1*3P
- 3rd weight: display_line_2 and 3

create de-normalized table
- generated-id, id, code, display line 1-2-3, regimen_code_hx, med_id, is_global = FALSE|TRUE
- fill med-usage table without med_id and is_global
after search: remove duplicate id, before return result

*/
