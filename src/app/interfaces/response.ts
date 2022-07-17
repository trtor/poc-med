import type { MedicationMasterCsv } from "./redis-model-interface";

export interface MedicationMasterOkResponse extends GeneralSuccessResponse {
  status: 200;
  payload: MedicationMasterCsv[];
}

export interface MedicationMasterErrorResponse extends GeneralErrorResponse {
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
