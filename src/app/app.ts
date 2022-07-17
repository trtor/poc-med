/* eslint-disable @typescript-eslint/no-misused-promises */
import cors from "cors";
import type { Application, Request, Response } from "express";
import express from "express";
import { seedMasterData } from "./init-data/seed-csv";
import { MedApiPathEnum } from "./interfaces/med-api-path";
import { searchMedicationMaster } from "./search/medication";
import { searchMedUsage } from "./search/usage";

const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

/**
 * Read master data to redis
 */
void seedMasterData();

app.get(MedApiPathEnum.medMaster, searchMedicationMaster);
app.get(MedApiPathEnum.usage, searchMedUsage);

/**
 * Health check
 */
app.get("/health", (_req: Request, res: Response) => {
  return res.status(204).end();
});

export default app;
