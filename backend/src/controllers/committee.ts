import { Request, Response } from 'express';
import { query } from '../config/database.js';

export const searchHistoricProjects = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title } = req.query;
        if (!title || typeof title !== 'string') {
            res.json([]);
            return;
        }
        
        // Find projects with similar titles
        const result = await query(
            `SELECT p.proposal_id, p.title, p.created_at, g.group_name 
             FROM project_proposals p
             JOIN project_groups g ON p.group_id = g.group_id
             WHERE p.title ILIKE $1 
             ORDER BY p.created_at DESC
             LIMIT 5`,
            [`%${title}%`]
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error searching historic projects:', error);
        res.status(500).json({ error: 'Failed to search projects' });
    }
};
