import type { Request, Response } from "express";

export async function searchMedUsage(
  req: Request<unknown, unknown, unknown, { medId?: string; s?: string }>,
  res: Response
): Promise<Response> {
  const { medId, s } = req.query;

  await Promise.resolve(null);

  return res.status(200);
}

/*

1st med-master key [pk] -> drug-master-usage-relation -> medication-usage

2nd med-master dosage_form -> drug-usage-global -> medication-usage

3rd med-usage 
- 1st weight: regimen_code_hn if length=1
- 2nd weight: code if length=2
- 3rd weight: display_line_2 and 3


create de-normalized table
- generated-id, id, code, display line 1-2-3, regimen_code_hx, med_id, is_global = FALSE|TRUE
- fill med-usage table without med_id and is_global
after search: remove duplicate id, before return result

*/
