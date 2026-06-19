import { Request, Response } from 'express';
import { query } from '../config/database.js';
import { handleDbError } from '../utils/dbError.js';

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
    } catch (error: any) {
        handleDbError(error, res, 'save rubric', {});
    }
};

export const getRubricTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(`SELECT * FROM rubric_templates ORDER BY created_at DESC`);
        res.json(result);
    } catch (error: any) {
        handleDbError(error, res, 'fetch rubrics', []);
    }
};

export const deleteRubricTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await query(`DELETE FROM rubric_templates WHERE template_id = $1`, [id]);
        res.json({ message: 'Rubric deleted successfully' });
    } catch (error: any) {
        handleDbError(error, res, 'delete rubric', {});
    }
};
