import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { handleDbError } from '../utils/dbError.js';

export const getNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const user_id = (req as any).user?.user_id;
        
        if (!user_id) {
            res.status(401).json({ 
                error: 'Unauthorized',
                message: 'User ID not found in token',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'student_notes'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.warn('student_notes table does not exist. Run migrations.');
            res.status(200).json({ content: '' });
            return;
        }

        const result = await pool.query(
            `SELECT * FROM student_notes WHERE student_id = $1`,
            [user_id]
        );
        
        res.status(200).json(result.rows[0] || { content: '' });
    } catch (error: any) {
        handleDbError(error, res, 'notes operation', {});
    }
};

export const saveNote = async (req: Request, res: Response): Promise<void> => {
    try {
        const { content } = req.body;
        const user_id = (req as any).user?.user_id;
        
        if (!user_id) {
            res.status(401).json({ 
                error: 'Unauthorized',
                message: 'User ID not found in token',
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (content === undefined) {
            res.status(400).json({ 
                error: 'Validation error',
                message: 'Content field is required',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'student_notes'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            res.status(503).json({ 
                error: 'Database not initialized',
                message: 'student_notes table does not exist. Run migrations.',
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // Upsert logic
        const existing = await pool.query(
            `SELECT * FROM student_notes WHERE student_id = $1`, 
            [user_id]
        );
        
        if (existing.rows.length > 0) {
            const result = await pool.query(
                `UPDATE student_notes SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2 RETURNING *`,
                [content, user_id]
            );
            res.status(200).json(result.rows[0]);
        } else {
            const result = await pool.query(
                `INSERT INTO student_notes (student_id, content) VALUES ($1, $2) RETURNING *`,
                [user_id, content]
            );
            res.status(201).json(result.rows[0]);
        }
    } catch (error: any) {
        handleDbError(error, res, 'notes operation', {});
    }
};
