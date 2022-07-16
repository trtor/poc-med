import type { Request, Response } from "express";

export async function searchMedUsage(
  req: Request<unknown, unknown, unknown, { medId?: string; s?: string }>,
  res: Response
): Promise<Response> {
  const { medId, s } = req.query;

  await Promise.resolve(null);

  return res.status(200);
}
