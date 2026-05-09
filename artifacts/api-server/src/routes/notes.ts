import { Router } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, desc, sql, or, ilike } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";

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

// GET /notes — list all notes, with optional search
router.get("/notes", requireAuth, async (req: any, res) => {
  try {
    const q = req.query.q as string | undefined;
    const conditions = [eq(notesTable.userId, req.userId)];

    if (q && q.trim()) {
      conditions.push(
        or(
          ilike(notesTable.title, `%${q}%`),
          ilike(notesTable.content, `%${q}%`)
        ) as any
      );
    }

    const notes = await db
      .select()
      .from(notesTable)
      .where(and(...conditions))
      .orderBy(desc(notesTable.pinned), desc(notesTable.updatedAt));

    res.json(notes);
  } catch (err) {
    req.log.error({ err }, "Failed to list notes");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /notes/stats — note statistics
router.get("/notes/stats", requireAuth, async (req: any, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db
      .select({
        totalNotes: sql<number>`count(*)::int`,
        pinnedNotes: sql<number>`count(*) filter (where ${notesTable.pinned} = true)::int`,
        updatedToday: sql<number>`count(*) filter (where ${notesTable.updatedAt} >= ${today})::int`,
      })
      .from(notesTable)
      .where(eq(notesTable.userId, req.userId));

    const row = result[0];
    res.json({
      totalNotes: row?.totalNotes ?? 0,
      pinnedNotes: row?.pinnedNotes ?? 0,
      updatedToday: row?.updatedToday ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get note stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /notes — create a note
router.post("/notes", requireAuth, async (req: any, res) => {
  try {
    const { title = "", content = "", color = "#ffffff", pinned = false } = req.body;
    const [note] = await db
      .insert(notesTable)
      .values({ userId: req.userId, title, content, color, pinned })
      .returning();
    res.status(201).json(note);
  } catch (err) {
    req.log.error({ err }, "Failed to create note");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /notes/:id — get a single note
router.get("/notes/:id", requireAuth, async (req: any, res) => {
  try {
    const [note] = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.id, req.params.id));

    if (!note) return res.status(404).json({ error: "Not found" });
    if (note.userId !== req.userId) return res.status(401).json({ error: "Unauthorized" });

    res.json(note);
  } catch (err) {
    req.log.error({ err }, "Failed to get note");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /notes/:id — update a note
router.patch("/notes/:id", requireAuth, async (req: any, res) => {
  try {
    const [existing] = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.id, req.params.id));

    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.userId) return res.status(401).json({ error: "Unauthorized" });

    const updateData: Partial<typeof notesTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    const { title, content, color, pinned } = req.body;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (color !== undefined) updateData.color = color;
    if (pinned !== undefined) updateData.pinned = pinned;

    const [updated] = await db
      .update(notesTable)
      .set(updateData)
      .where(eq(notesTable.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update note");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /notes/:id — delete a note
router.delete("/notes/:id", requireAuth, async (req: any, res) => {
  try {
    const [existing] = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.id, req.params.id));

    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== req.userId) return res.status(401).json({ error: "Unauthorized" });

    await db.delete(notesTable).where(eq(notesTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete note");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
