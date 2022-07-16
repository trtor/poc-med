import { v4 as uuidv4 } from "uuid";
import type {
  DrugMasterUsageCsv,
  DrugUsageGlobalCsv,
  MedicationMasterCsv,
  MedicationUsageCsv,
  MedicationUsageDenormalized,
} from "./interface";
import type { ReadCsvResponse } from "./seed-csv";
import { createFtIndex, saveRedisChunk } from "./seed-csv";

export async function drugUsageImport(
  medicationUsage: ReadCsvResponse<MedicationUsageCsv>,
  drugMasterUsageRelation: ReadCsvResponse<DrugMasterUsageCsv>,
  medicationMaster: ReadCsvResponse<MedicationMasterCsv>,
  drugUsageGlobal: ReadCsvResponse<DrugUsageGlobalCsv>
): Promise<void> {
  // De-normalize table
  const medUsageDenormalized = medicationUsageMergeDenormalize(
    medicationUsage.data,
    drugMasterUsageRelation.data,
    medicationMaster.data,
    drugUsageGlobal.data
  );
  // eslint-disable-next-line no-console
  console.log("Medication Usage (denormalized)", medUsageDenormalized.length);

  await createFtIndex("MEDICATION_USAGE_DENORMALIZED", [
    ["id", "TEXT", "NOSTEM"],
    ["code", "TEXT", "NOSTEM", "WEIGHT", "5.0"],
    ["display_line_1", "TEXT", "NOSTEM", "WEIGHT", "1.0"],
    ["display_line_2", "TEXT", "NOSTEM", "WEIGHT", "1.0"],
    ["display_line_3", "TEXT", "NOSTEM", "WEIGHT", "1.0"],
    ["REGIMEN_CODE_HX", "TAG"],
    ["medication_master_id", "TAG"],
    ["dosage_form", "TAG"],
    ["match_med_id_and_form", "TAG"],
  ]);
  await saveRedisChunk<MedicationUsageDenormalized>("MEDICATION_USAGE_DENORMALIZED", "uuid", medUsageDenormalized);
}

function medicationUsageMergeDenormalize(
  medicationUsageData: MedicationUsageCsv[],
  drugMasterUsageRelationData: DrugMasterUsageCsv[],
  medicationMasterData: MedicationMasterCsv[],
  drugUsageGlobalData: DrugUsageGlobalCsv[]
): MedicationUsageDenormalized[] {
  return medicationUsageData.flatMap<MedicationUsageDenormalized>(usage => {
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

    const matchMedMasterIdAndDosageForm = filterMedMasterDosageForm.map<MedicationUsageDenormalized>(medMaster => ({
      ...usage,
      uuid: uuidv4(),
      medication_master_id: medMaster.id,
      dosage_form: medMaster.dosage_form,
      match_med_id_and_form: "1",
    }));
    const matchMedMasterId = medMasterRelationId.map<MedicationUsageDenormalized>(id => ({
      ...usage,
      uuid: uuidv4(),
      medication_master_id: id,
      dosage_form: undefined,
      match_med_id_and_form: "0",
    }));
    const matchGlobalDosageForm = drugUsageGlobalRelationForm.map<MedicationUsageDenormalized>(dosageForm => ({
      ...usage,
      uuid: uuidv4(),
      medication_master_id: undefined,
      dosage_form: dosageForm,
      match_med_id_and_form: "0",
    }));
    const originalMedicationUsage: MedicationUsageDenormalized = {
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
