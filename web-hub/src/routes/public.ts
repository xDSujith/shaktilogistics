import { Router, Request, Response } from 'express';
import { query } from '../db/pool';

const router = Router();

router.get('/roster', async (_req: Request, res: Response) => {
  const result = await query(
    `SELECT id, driver_name, join_date, rank, status
     FROM roster_entries
     WHERE status = 'active'
     ORDER BY
       CASE rank
         WHEN 'Owner' THEN 1
         WHEN 'Manager' THEN 2
         WHEN 'Driver' THEN 3
         WHEN 'Trial' THEN 4
       END,
       driver_name ASC`
  );
  res.json(result.rows.map(r => ({
    id: r.id,
    driverName: r.driver_name,
    joinDate: r.join_date,
    rank: r.rank,
    status: r.status,
  })));
});

router.get('/events', async (_req: Request, res: Response) => {
  const result = await query(
    'SELECT id, title, description, event_date, location FROM events ORDER BY event_date ASC'
  );
  res.json(result.rows.map(r => ({
    id: r.id,
    title: r.title,
    description: r.description,
    eventDate: r.event_date,
    location: r.location,
  })));
});

export default router;
