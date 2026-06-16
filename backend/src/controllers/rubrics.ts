import { Request, Response } from 'express';
import { query } from '../config/database.js';

export const saveRubricTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, schema, target_phase = 'FINAL' } = req.body;
        
        const result = await query(
            `INSERT INTO rubric_templates (name, schema, target_phase) VALUES ($1, $2, $3)
             ON CONFLICT (name) DO UPDATE SET schema = EXCLUDED.schema, target_phase = EXCLUDED.target_phase, created_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [name, JSON.stringify(schema), target_phase]
        );
        res.json(result[0]);
    } catch (error) {
        console.error('Error saving rubric:', error);
        res.status(500).json({ error: 'Failed to save rubric' });
    }
};

export const getRubricTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(`SELECT * FROM rubric_templates ORDER BY created_at DESC`);
        res.json(result);
    } catch (error) {
        console.error('Error fetching rubrics:', error);
        res.status(500).json({ error: 'Failed to fetch rubrics' });
    }
};

export const deleteRubricTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await query(`DELETE FROM rubric_templates WHERE template_id = $1`, [id]);
        res.json({ message: 'Rubric deleted successfully' });
    } catch (error) {
        console.error('Error deleting rubric:', error);
        res.status(500).json({ error: 'Failed to delete rubric' });
    }
};
