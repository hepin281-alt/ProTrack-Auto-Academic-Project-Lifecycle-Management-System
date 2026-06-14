import { Request, Response } from 'express';
import { query } from '../config/database.js';

export const getResources = async (req: Request, res: Response): Promise<void> => {
    try {
        const { group_id } = req.params;
        const result = await query(
            `SELECT r.*, u.email as uploaded_by_email 
             FROM group_resources r
             LEFT JOIN users u ON r.uploaded_by = u.user_id
             WHERE r.group_id = $1
             ORDER BY r.created_at DESC`,
            [group_id]
        );
        res.json(result);
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
};

export const createResource = async (req: Request, res: Response): Promise<void> => {
    try {
        const { group_id, title, url, description, category } = req.body;
        const user_id = (req as any).user.user_id;
        
        let resource_type = req.body.resource_type || 'LINK';
        let file_path = null;

        if (req.file) {
            resource_type = 'FILE';
            file_path = `/uploads/${req.file.filename}`;
        }
        
        const result = await query(
            `INSERT INTO group_resources (group_id, title, url, uploaded_by, resource_type, description, category, file_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [group_id, title, url || null, user_id, resource_type, description || null, category || 'General', file_path]
        );
        res.status(201).json(result[0]);
    } catch (error) {
        console.error('Error creating resource:', error);
        res.status(500).json({ error: 'Failed to create resource' });
    }
};
