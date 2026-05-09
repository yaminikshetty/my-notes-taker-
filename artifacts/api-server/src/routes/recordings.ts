import { Router } from "express";
import { getAuth } from "@clerk/express";
import { eq, desc, sql } from "drizzle-orm";
import { db, recordingsTable } from "@workspace/db";
import {
  CreateRecordingBody,
  UpdateRecordingBody,
  GetRecordingParams,
  UpdateRecordingParams,
  DeleteRecordingParams,
  GetSharedRecordingParams,
} from "@workspace/api-zod";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.userId = userId;
  next();
}

// GET /recordings — list user's recordings
router.get("/recordings", requireAuth, async (req: any, res) => {
  try {
    const recordings = await db
      .select()
      .from(recordingsTable)
      .where(eq(recordingsTable.userId, req.userId))
      .orderBy(desc(recordingsTable.createdAt));
    res.json(recordings);
  } catch (err) {
    req.log.error({ err }, "Failed to list recordings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /recordings/stats — recording stats
router.get("/recordings/stats", requireAuth, async (req: any, res) => {
  try {
    const result = await db
      .select({
        totalTapes: sql<number>`count(*)::int`,
        totalDurationSeconds: sql<number>`coalesce(sum(${recordingsTable.duration}), 0)`,
        newestTapeDate: sql<string | null>`max(${recordingsTable.createdAt})`,
      })
      .from(recordingsTable)
      .where(eq(recordingsTable.userId, req.userId));

    const row = result[0];
    res.json({
      totalTapes: row?.totalTapes ?? 0,
      totalDurationSeconds: row?.totalDurationSeconds ?? 0,
      newestTapeDate: row?.newestTapeDate ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /recordings — create a recording
router.post("/recordings", requireAuth, async (req: any, res) => {
  const parse = CreateRecordingBody.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.message });
  }

  try {
    const [recording] = await db
      .insert(recordingsTable)
      .values({
        userId: req.userId,
        title: parse.data.title,
        description: parse.data.description ?? null,
        duration: parse.data.duration,
        audioObjectPath: parse.data.audioObjectPath,
      })
      .returning();
    res.status(201).json(recording);
  } catch (err) {
    req.log.error({ err }, "Failed to create recording");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /recordings/:id — get a recording
router.get("/recordings/:id", requireAuth, async (req: any, res) => {
  const parse = GetRecordingParams.safeParse({ id: req.params.id });
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const [recording] = await db
      .select()
      .from(recordingsTable)
      .where(eq(recordingsTable.id, parse.data.id));

    if (!recording) return res.status(404).json({ error: "Not found" });
    if (recording.userId !== req.userId) return res.status(401).json({ error: "Unauthorized" });

    res.json(recording);
  } catch (err) {
    req.log.error({ err }, "Failed to get recording");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /recordings/:id — update recording label
router.patch("/recordings/:id", requireAuth, async (req: any, res) => {
  const paramsResult = UpdateRecordingParams.safeParse({ id: req.params.id });
  const bodyResult = UpdateRecordingBody.safeParse(req.body);

  if (!paramsResult.success || !bodyResult.success) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const [existing] = await db
      .select()
      .from(recordingsTable)
      .where(eq(recordingsTable.id, paramsResult.data.id));

    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.userId) return res.status(401).json({ error: "Unauthorized" });

    const updateData: Partial<typeof recordingsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (bodyResult.data.title !== undefined) updateData.title = bodyResult.data.title;
    if (bodyResult.data.description !== undefined) updateData.description = bodyResult.data.description;

    const [updated] = await db
      .update(recordingsTable)
      .set(updateData)
      .where(eq(recordingsTable.id, paramsResult.data.id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update recording");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /recordings/:id — delete a recording
router.delete("/recordings/:id", requireAuth, async (req: any, res) => {
  const parse = DeleteRecordingParams.safeParse({ id: req.params.id });
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const [existing] = await db
      .select()
      .from(recordingsTable)
      .where(eq(recordingsTable.id, parse.data.id));

    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.userId) return res.status(401).json({ error: "Unauthorized" });

    await db.delete(recordingsTable).where(eq(recordingsTable.id, parse.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete recording");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /shared/:shareToken — public tape access (no auth required)
router.get("/shared/:shareToken", async (req: any, res) => {
  const parse = GetSharedRecordingParams.safeParse({ shareToken: req.params.shareToken });
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid token" });
  }

  try {
    const [recording] = await db
      .select()
      .from(recordingsTable)
      .where(eq(recordingsTable.shareToken, parse.data.shareToken));

    if (!recording) return res.status(404).json({ error: "Not found" });
    res.json(recording);
  } catch (err) {
    req.log.error({ err }, "Failed to get shared recording");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
