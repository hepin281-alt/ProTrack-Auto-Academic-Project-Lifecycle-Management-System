import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { handleDbError } from '../utils/dbError.js';

export const getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check if table exists first (leaving this as a secondary check, but also relying on handleDbError for clean errors)
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'global_settings'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.warn('global_settings table does not exist. Run migrations.');
            res.status(200).json({});
            return;
        }

        const result = await pool.query('SELECT key, value FROM global_settings');
        const settings: Record<string, any> = {};
        for (const row of result.rows) {
            try {
                // Try to parse as JSON, fallback to raw value
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        }
        res.status(200).json(settings);
    } catch (error: any) {
        handleDbError(error, res, 'fetch settings', {});
    }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { key, value } = req.body;
        
        if (!key) {
            res.status(400).json({ 
                error: 'Validation error',
                message: 'Setting key is required',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Check if table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'global_settings'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            res.status(503).json({ 
                error: 'Database not initialized',
                message: 'global_settings table does not exist. Run migrations.',
                timestamp: new Date().toISOString()
            });
            return;
        }

        await pool.query(
            'INSERT INTO global_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            [key, JSON.stringify(value)]
        );
        
        res.status(200).json({ 
            message: 'Settings updated successfully',
            key,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        handleDbError(error, res, 'update settings', {});
    }
};
