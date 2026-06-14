import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { sendWhitelistInvitationEmail } from '../utils/emailService.js';
import xlsx from 'xlsx';

export async function uploadWhitelist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const originalName = req.file.originalname.toLowerCase();
        let results: any[] = [];

        if (originalName.endsWith('.csv')) {
            const bufferStream = new Readable();
            bufferStream.push(req.file.buffer);
            bufferStream.push(null);

            bufferStream
                .pipe(csvParser())
                .on('data', (data) => results.push(data))
                .on('end', () => processResults(results, res));
        } else if (originalName.endsWith('.xlsx') || originalName.endsWith('.xls')) {
            try {
                const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                results = xlsx.utils.sheet_to_json(worksheet);
                await processResults(results, res);
            } catch (err) {
                console.error("Excel parse error:", err);
                res.status(400).json({ error: 'Invalid Excel file format' });
            }
        } else {
            res.status(400).json({ error: 'Unsupported file type. Please upload a .csv or .xlsx file.' });
        }
    } catch (error) {
        console.error('Upload whitelist error:', error);
        res.status(500).json({ error: 'Failed to process whitelist upload' });
    }
}

async function processResults(results: any[], res: Response) {
    let successCount = 0;
    let errorCount = 0;

    for (const row of results) {
        const prn_no = row.prn_no || row.PRN || row.prn;
        const email = row.email || row.Email || row.EMAIL;
        const full_name = row.full_name || row.name || row.Name || row.NAME;

        if (!prn_no || !email || !full_name) {
            errorCount++;
            continue;
        }

        try {
            const res = await query(
                `INSERT INTO student_whitelist (prn_no, email, full_name)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (prn_no) DO NOTHING RETURNING id`,
                [prn_no, email, full_name]
            );
            if (res.length > 0) {
                successCount++;
                // Send email asynchronously without blocking the loop
                sendWhitelistInvitationEmail(email, full_name, 'STUDENT').catch(e => console.error("Email failed:", e));
            }
        } catch (dbErr) {
            console.error('Error inserting row:', dbErr);
            errorCount++;
        }
    }

    res.status(200).json({
        message: 'Upload completed',
        totalProcessed: results.length,
        successCount,
        errorCount
    });
}

export async function getWhitelist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const whitelist = await query(
            'SELECT id, prn_no, email, full_name, is_claimed, created_at FROM student_whitelist ORDER BY created_at DESC'
        );
        res.status(200).json(whitelist);
    } catch (error) {
        console.error('Fetch whitelist error:', error);
        res.status(500).json({ error: 'Failed to fetch whitelist' });
    }
}

export async function addStudentToWhitelist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { prn_no, email, full_name } = req.body;
        if (!prn_no || !email || !full_name) {
            res.status(400).json({ error: 'PRN, Email, and Full Name are required' });
            return;
        }

        const result = await query(
            `INSERT INTO student_whitelist (prn_no, email, full_name)
             VALUES ($1, $2, $3)
             ON CONFLICT (prn_no) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name RETURNING id`,
            [prn_no, email, full_name]
        );

        if (result.length > 0) {
            sendWhitelistInvitationEmail(email, full_name, 'STUDENT').catch(e => console.error("Email failed:", e));
        }

        res.status(201).json({ message: 'Student added to whitelist' });
    } catch (error) {
        console.error('Add student whitelist error:', error);
        res.status(500).json({ error: 'Failed to add student to whitelist' });
    }
}

// ---------------------------------------------------------------
// Faculty Whitelist
// ---------------------------------------------------------------

export async function uploadFacultyWhitelist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const originalName = req.file.originalname.toLowerCase();
        let results: any[] = [];

        if (originalName.endsWith('.csv')) {
            const bufferStream = new Readable();
            bufferStream.push(req.file.buffer);
            bufferStream.push(null);

            bufferStream
                .pipe(csvParser())
                .on('data', (data) => results.push(data))
                .on('end', () => processFacultyResults(results, res));
        } else if (originalName.endsWith('.xlsx') || originalName.endsWith('.xls')) {
            try {
                const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                results = xlsx.utils.sheet_to_json(worksheet);
                await processFacultyResults(results, res);
            } catch (err) {
                console.error('Excel parse error:', err);
                res.status(400).json({ error: 'Invalid Excel file format' });
            }
        } else {
            res.status(400).json({ error: 'Unsupported file type. Please upload a .csv or .xlsx file.' });
        }
    } catch (error) {
        console.error('Upload faculty whitelist error:', error);
        res.status(500).json({ error: 'Failed to process faculty whitelist upload' });
    }
}

async function processFacultyResults(results: any[], res: Response) {
    let successCount = 0;
    let errorCount = 0;

    const validRoles = ['GUIDE', 'COORDINATOR', 'COMMITTEE'];

    for (const row of results) {
        const email       = row.email       || row.Email       || row.EMAIL;
        const employee_id = row.employee_id || row.EmployeeId  || row.EMPLOYEE_ID || null;
        const full_name   = row.full_name   || row.name        || row.Name || row.NAME;
        const role        = (row.role       || row.Role        || row.ROLE || '').toUpperCase();

        if (!email || !full_name || !validRoles.includes(role)) {
            errorCount++;
            continue;
        }

        try {
            const res = await query(
                `INSERT INTO faculty_whitelist (email, employee_id, full_name, role)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (email) DO NOTHING RETURNING id`,
                [email, employee_id, full_name, role]
            );
            if (res.length > 0) {
                successCount++;
                sendWhitelistInvitationEmail(email, full_name, role).catch(e => console.error("Email failed:", e));
            }
        } catch (dbErr) {
            console.error('Error inserting faculty row:', dbErr);
            errorCount++;
        }
    }

    res.status(200).json({
        message: 'Faculty whitelist upload completed',
        totalProcessed: results.length,
        successCount,
        errorCount
    });
}

export async function getFacultyWhitelist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const whitelist = await query(
            'SELECT id, email, employee_id, full_name, role, is_claimed, created_at FROM faculty_whitelist ORDER BY created_at DESC'
        );
        res.status(200).json(whitelist);
    } catch (error) {
        console.error('Fetch faculty whitelist error:', error);
        res.status(500).json({ error: 'Failed to fetch faculty whitelist' });
    }
}

export async function addFacultyToWhitelist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { email, full_name, role } = req.body;
        if (!email || !full_name || !role) {
            res.status(400).json({ error: 'Email, full name, and role are required' });
            return;
        }

        const validRoles = ['GUIDE', 'COMMITTEE', 'COORDINATOR'];
        if (!validRoles.includes(role)) {
            res.status(400).json({ error: 'Invalid role' });
            return;
        }

        const result = await query(
            `INSERT INTO faculty_whitelist (email, employee_id, full_name, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role RETURNING id`,
            [email, email.split('@')[0], full_name, role]
        );

        if (result.length > 0) {
            sendWhitelistInvitationEmail(email, full_name, role).catch(e => console.error("Email failed:", e));
        }

        res.status(201).json({ message: 'Faculty added to whitelist' });
    } catch (error) {
        console.error('Add faculty whitelist error:', error);
        res.status(500).json({ error: 'Failed to add faculty to whitelist' });
    }
}

export async function deleteStudentFromWhitelist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        await query('DELETE FROM student_whitelist WHERE id = $1', [id]);
        res.status(200).json({ message: 'Student removed from whitelist' });
    } catch (error) {
        console.error('Delete student whitelist error:', error);
        res.status(500).json({ error: 'Failed to delete student from whitelist' });
    }
}

export async function deleteFacultyFromWhitelist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        await query('DELETE FROM faculty_whitelist WHERE id = $1', [id]);
        res.status(200).json({ message: 'Faculty removed from whitelist' });
    } catch (error) {
        console.error('Delete faculty whitelist error:', error);
        res.status(500).json({ error: 'Failed to delete faculty from whitelist' });
    }
}
