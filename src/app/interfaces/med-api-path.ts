export enum MedApiPathEnum {
  medMaster = "/search",
  usage = "/usage",
}

export type MedMasterParams = {
  s?: string;
};

export type UsageRequestParams = {
  id?: string;
  s?: string;
};
