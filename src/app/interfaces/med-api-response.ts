import type { MedicationMasterCsv, MedicationUsageDenormalized } from "./med-api-redis-model";

/**
 * Medication master
 */
export interface MedicationMasterOkResponse extends GeneralSuccessResponse {
  status: 200;
  payload: MedicationMasterCsv[];
}
export interface MedicationMasterErrorResponse extends GeneralErrorResponse {
  status: 400 | 500;
}

/**
 * Usage
 */
export interface MedicationUsageDenormalizedOkResponse extends GeneralSuccessResponse {
  status: 200;
  payload: MedicationUsageDenormalized[];
}
export interface MedicationUsageDenormalizedErrorResponse extends GeneralErrorResponse {
  status: 400 | 500;
}

interface GeneralSuccessResponse {
  status: 200 | 201;
  payload: unknown;
}

interface GeneralErrorResponse {
  status: number;
  message?: string;
  error?: unknown;
}
