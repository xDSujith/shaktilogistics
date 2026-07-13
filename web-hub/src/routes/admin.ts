import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin'));

// ── Validation schemas ──

const rosterCreateSchema = z.object({
  driverName: z.string().min(1, 'Driver name is required').max(100),
  joinDate: z.string().optional(),
  rank: z.enum(['Owner', 'Manager', 'Driver', 'Trial']).optional(),
  status: z.enum(['active', 'inactive', 'retired']).optional(),
});

const rosterUpdateSchema = z.object({
  driverName: z.string().min(1).max(100).optional(),
  joinDate: z.string().optional(),
  rank: z.enum(['Owner', 'Manager', 'Driver', 'Trial']).optional(),
  status: z.enum(['active', 'inactive', 'retired']).optional(),
});

const eventCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  eventDate: z.string().min(1, 'Event date is required'),
  location: z.string().max(500).optional(),
});

const eventUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  eventDate: z.string().optional(),
  location: z.string().max(500).optional(),
});

// ── ROSTER CRUD ──

router.get('/roster', async (_req: AuthRequest, res: Response) => {
  const result = await query(
    'SELECT id, driver_name, join_date, rank, status, added_by, created_at, updated_at FROM roster_entries ORDER BY join_date DESC'
  );
  res.json(result.rows.map(r => ({
    id: r.id,
    driverName: r.driver_name,
    joinDate: r.join_date,
    rank: r.rank,
    status: r.status,
    addedBy: r.added_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })));
});

router.post('/roster', async (req: AuthRequest, res: Response) => {
  const parsed = rosterCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { driverName, joinDate, rank, status } = parsed.data;
  const result = await query(
    `INSERT INTO roster_entries (driver_name, join_date, rank, status, added_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, driver_name, join_date, rank, status, added_by, created_at, updated_at`,
    [driverName, joinDate || new Date().toISOString().split('T')[0], rank || 'Driver', status || 'active', req.user!.sub]
  );

  const r = result.rows[0];
  res.status(201).json({
    id: r.id,
    driverName: r.driver_name,
    joinDate: r.join_date,
    rank: r.rank,
    status: r.status,
    addedBy: r.added_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
});

router.put('/roster/:id', async (req: AuthRequest, res: Response) => {
  const parsed = rosterUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid roster entry id' });
    return;
  }

  const existing = await query('SELECT id FROM roster_entries WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Roster entry not found' });
    return;
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const { driverName, joinDate, rank, status } = parsed.data;
  if (driverName !== undefined) { fields.push(`driver_name = $${idx++}`); values.push(driverName); }
  if (joinDate !== undefined) { fields.push(`join_date = $${idx++}`); values.push(joinDate); }
  if (rank !== undefined) { fields.push(`rank = $${idx++}`); values.push(rank); }
  if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  fields.push(`updated_at = now()`);
  values.push(id);

  const result = await query(
    `UPDATE roster_entries SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, driver_name, join_date, rank, status, added_by, created_at, updated_at`,
    values
  );

  const r = result.rows[0];
  res.json({
    id: r.id,
    driverName: r.driver_name,
    joinDate: r.join_date,
    rank: r.rank,
    status: r.status,
    addedBy: r.added_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
});

router.delete('/roster/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid roster entry id' });
    return;
  }

  const result = await query('DELETE FROM roster_entries WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Roster entry not found' });
    return;
  }

  res.json({ message: 'Roster entry deleted', id });
});

// ── EVENTS CRUD ──

router.get('/events', async (_req: AuthRequest, res: Response) => {
  const result = await query(
    'SELECT id, title, description, event_date, location, created_by, created_at, updated_at FROM events ORDER BY event_date DESC'
  );
  res.json(result.rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    eventDate: r.event_date,
    location: r.location,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })));
});

router.post('/events', async (req: AuthRequest, res: Response) => {
  const parsed = eventCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { title, description, eventDate, location } = parsed.data;
  const result = await query(
    `INSERT INTO events (title, description, event_date, location, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, title, description, event_date, location, created_by, created_at, updated_at`,
    [title, description || '', eventDate, location || '', req.user!.sub]
  );

  const r = result.rows[0];
  res.status(201).json({
    id: r.id,
    title: r.title,
    description: r.description,
    eventDate: r.event_date,
    location: r.location,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
});

router.put('/events/:id', async (req: AuthRequest, res: Response) => {
  const parsed = eventUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid event id' });
    return;
  }

  const existing = await query('SELECT id FROM events WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const { title, description, eventDate, location } = parsed.data;
  if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
  if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
  if (eventDate !== undefined) { fields.push(`event_date = $${idx++}`); values.push(eventDate); }
  if (location !== undefined) { fields.push(`location = $${idx++}`); values.push(location); }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  fields.push(`updated_at = now()`);
  values.push(id);

  const result = await query(
    `UPDATE events SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, title, description, event_date, location, created_by, created_at, updated_at`,
    values
  );

  const r = result.rows[0];
  res.json({
    id: r.id,
    title: r.title,
    description: r.description,
    eventDate: r.event_date,
    location: r.location,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
});

router.delete('/events/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid event id' });
    return;
  }

  const result = await query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  res.json({ message: 'Event deleted', id });
});

export default router;
