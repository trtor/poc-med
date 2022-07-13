export type MedicationMasterCsv = {
  // medication-master.csv
  id: string; // primary key
  name: string;
  tmt_id: string | null;
  strength: string | null;
  unit: string | null;
  dosage_form: string | null;
  category: string | null;
  therapeutic_group: string | null;
};

export type DrugMasterUsageCsv = {
  // drug_master_usage_relation.csv
  drug_master_usage_id: string; // primary key
  drug_master_id: string;
};

export type MedicationUsageCsv = {
  // medication-usage.csv
  id: string; // primary key
  code: string;
  display_line_1: string | null;
  display_line_2: string | null;
  display_line_3: string | null;
  REGIMEN_CODE_HX: string | null;
};

export type DrugUsageGlobalCsv = {
  // drug-usage-global.csv
  drug_usage_id: string; // primary key
  dosage_form: string | null;
};

export type AllCsvTypes = MedicationMasterCsv | DrugMasterUsageCsv | MedicationUsageCsv | DrugUsageGlobalCsv;
