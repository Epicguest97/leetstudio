import { Router, type IRouter } from "express";
import { db, languagesTable } from "@workspace/db";
import { ListLanguagesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/languages", async (_req, res): Promise<void> => {
  const languages = await db.select().from(languagesTable).orderBy(languagesTable.id);
  res.json(ListLanguagesResponse.parse(languages));
});

export default router;
