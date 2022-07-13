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
