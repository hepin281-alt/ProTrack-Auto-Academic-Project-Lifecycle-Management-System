import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { handleDbError } from '../utils/dbError.js';

export async function createOrUpdateSchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        // Fallback to group_id for backward compatibility
        const group_ids: string[] = req.body.group_ids || (req.body.group_id ? [req.body.group_id] : []);
        const { phase, presentation_time, venue } = req.body;

        if (group_ids.length === 0) {
            res.status(400).json({ error: 'At least one group_id is required' });
            return;
        }

        const intervalMinutes = req.body.interval_minutes ? parseInt(req.body.interval_minutes, 10) : 0;

        const results = [];
        const baseTime = new Date(presentation_time).getTime();

        for (let i = 0; i < group_ids.length; i++) {
            const groupId = group_ids[i];
            const slotTimeMs = baseTime + (i * intervalMinutes * 60000);
            const slotTimeIso = new Date(slotTimeMs).toISOString();

            const result = await query(
                `INSERT INTO presentation_schedules (group_id, phase, presentation_time, venue)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (group_id, phase) 
                 DO UPDATE SET presentation_time = EXCLUDED.presentation_time, venue = EXCLUDED.venue
                 RETURNING *`,
                [groupId, phase, slotTimeIso, venue]
            );
            if (result.length > 0) results.push(result[0]);
        }

        res.status(200).json({ message: 'Schedules created successfully', schedules: results });
    } catch (error: any) {
        handleDbError(error, res, 'failed to save schedule', {});
    }
}

export async function getSchedules(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const role = req.user?.role;
        const userId = req.user?.user_id;
        
        let sql = `
            SELECT s.*, g.group_name
            FROM presentation_schedules s
            JOIN project_groups g ON s.group_id = g.group_id
        `;
        const params: any[] = [];

        if (role === 'STUDENT') {
            sql += ` JOIN group_members gm ON gm.group_id = g.group_id WHERE gm.student_id = $1`;
            params.push(userId);
        } else if (role === 'GUIDE') {
            sql += ` WHERE g.guide_id = $1`;
            params.push(userId);
        }

        sql += ` ORDER BY s.presentation_time ASC`;

        const schedules = await query(sql, params);
        res.status(200).json(schedules);
    } catch (error: any) {
        handleDbError(error, res, 'failed to fetch schedules', []);
    }
}

export async function getSmartSlots(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        // Mock smart scheduling logic: find open 1-hour slots today/tomorrow between 9 AM and 5 PM
        // that do not overlap with existing schedules.
        
        const existingSchedules = await query(
            `SELECT presentation_time FROM presentation_schedules
             WHERE presentation_time >= CURRENT_DATE`
        );
        
        const bookedTimes = existingSchedules.map((row: any) => new Date(row.presentation_time).getTime());
        
        const availableSlots = [];
        const currentDate = new Date();
        currentDate.setHours(9, 0, 0, 0); // Start at 9 AM today
        
        // Check next 5 days
        for (let day = 0; day < 5; day++) {
            const slotTime = new Date(currentDate);
            slotTime.setDate(slotTime.getDate() + day);
            
            // From 9 AM to 4 PM (meaning 4-5 PM is the last slot)
            for (let hour = 9; hour < 17; hour++) {
                slotTime.setHours(hour, 0, 0, 0);
                const timeMs = slotTime.getTime();
                
                // If it's in the past, skip
                if (timeMs < Date.now()) continue;
                
                // If not booked, add to available slots
                if (!bookedTimes.includes(timeMs)) {
                    availableSlots.push(new Date(timeMs).toISOString());
                }
            }
        }
        
        res.status(200).json({ slots: availableSlots });
    } catch (error: any) {
        handleDbError(error, res, 'failed to generate smart slots', {});
    }
}
