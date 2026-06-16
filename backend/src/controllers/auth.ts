import { Request, Response } from 'express';
import { query } from '../config/database.js';
import { generateToken } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { parsePRN } from '../utils/prnParser.js';

interface LoginRequest {
    email: string;
    password: string;
}

interface LoginResponse {
    user_id: string;
    email: string;
    full_name: string;
    role: string;
    token: string;
}

export async function login(req: Request, res: Response): Promise<void> {
    try {
        const { email, password } = req.body as LoginRequest;

        // Validate input
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        // Find user by email — also join student_profiles to get PRN
        const users = await query(
            `SELECT u.user_id, u.email, u.password_hash, u.role, u.full_name,
                    sp.prn_no, sp.roll_no, sp.batch_year
             FROM users u
             LEFT JOIN student_profiles sp ON sp.student_id = u.user_id
             WHERE u.email = $1`,
            [email]
        );

        if (users.length === 0) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        const user = users[0];

        // Verify password
        const passwordMatch = await comparePassword(password, user.password_hash);
        if (!passwordMatch) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        // Generate JWT token
        const token = generateToken({
            user_id: user.user_id,
            email: user.email,
            role: user.role
        });

        res.status(200).json({
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            prn_no: user.prn_no || null,
            roll_no: user.roll_no || null,
            batch_year: user.batch_year || null,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
}

export async function getMe(req: Request & { user?: { user_id: string; role: string } }, res: Response): Promise<void> {
    try {
        const userId = req.user?.user_id;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const users = await query(
            `SELECT u.user_id, u.email, u.role, u.full_name,
                    sp.prn_no, sp.roll_no, sp.batch_year,
                    fp.expertise_tags, fp.current_workload, fp.max_workload
             FROM users u
             LEFT JOIN student_profiles sp ON sp.student_id = u.user_id
             LEFT JOIN faculty_profiles fp ON fp.faculty_id = u.user_id
             WHERE u.user_id = $1`,
            [userId]
        );

        if (users.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
        const u = users[0];

        res.status(200).json({
            user_id: u.user_id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            prn_no: u.prn_no || null,
            roll_no: u.roll_no || null,
            batch_year: u.batch_year || null,
            expertise_tags: u.expertise_tags || [],
            current_workload: u.current_workload || 0,
            max_workload: u.max_workload || 4,
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
}

export async function register(req: Request, res: Response): Promise<void> {
    try {
        const { email, password, role, prn_no, roll_no, batch_year, expertise_tags, full_name } = req.body;

        // Validate input
        if (!email || !password || !role || !full_name) {
            res.status(400).json({ error: 'Email, password, full_name, and role are required' });
            return;
        }

        // Validate role
        const validRoles = ['STUDENT', 'GUIDE', 'COORDINATOR', 'COMMITTEE'];
        if (!validRoles.includes(role)) {
            res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
            return;
        }

        // Check if user already exists
        const existingUsers = await query(
            'SELECT user_id FROM users WHERE email = $1',
            [email]
        );

        if (existingUsers.length > 0) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Insert user
        const userResult = await query(
            'INSERT INTO users (email, password_hash, role, full_name) VALUES ($1, $2, $3, $4) RETURNING user_id, email, role, full_name',
            [email, passwordHash, role, full_name]
        );

        const newUser = userResult[0];

        // Insert role-specific profiles
        if (role === 'STUDENT') {
            if (!prn_no || !roll_no || !batch_year) {
                res.status(400).json({
                    error: 'For STUDENT role, prn_no, roll_no, and batch_year are required'
                });
                return;
            }

            const { batch_year: parsedBatch, roll_no: parsedRoll } = parsePRN(prn_no);
            const finalBatch = batch_year || parsedBatch;
            const finalRoll = roll_no || parsedRoll;

            await query(
                'INSERT INTO student_profiles (student_id, prn_no, roll_no, batch_year) VALUES ($1, $2, $3, $4)',
                [newUser.user_id, prn_no, finalRoll, finalBatch]
            );
        } else if (role === 'GUIDE') {
            const tags = (expertise_tags || []).map((t: string) => t.trim().toLowerCase()).filter(Boolean);
            await query(
                'INSERT INTO faculty_profiles (faculty_id, expertise_tags) VALUES ($1, $2)',
                [newUser.user_id, tags]
            );
        }

        // Generate token
        const token = generateToken({
            user_id: newUser.user_id,
            email: newUser.email,
            role: newUser.role
        });

        res.status(201).json({
            user_id: newUser.user_id,
            email: newUser.email,
            full_name: newUser.full_name,
            role: newUser.role,
            prn_no: prn_no || null,
            roll_no: roll_no || parsePRN(prn_no || '').roll_no || null,
            batch_year: batch_year || parsePRN(prn_no || '').batch_year || null,
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
}

export async function claimAccount(req: Request, res: Response): Promise<void> {
    try {
        const { role, email, password, prn_no, employee_id, expertise_tags } = req.body;

        if (!role || !email || !password) {
            res.status(400).json({ error: 'Role, email, and password are required' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        // Check if user already exists in users table
        const existing = await query('SELECT user_id FROM users WHERE email = $1', [email]);
        if (existing.length > 0) {
            res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
            return;
        }

        if (role === 'STUDENT') {
            // Student claim: verify PRN + email against student_whitelist
            if (!prn_no) {
                res.status(400).json({ error: 'PRN number is required for students' });
                return;
            }
            const whitelisted = await query(
                'SELECT id, is_claimed, full_name FROM student_whitelist WHERE prn_no = $1 AND email = $2',
                [prn_no, email]
            );
            if (whitelisted.length === 0) {
                res.status(404).json({ error: 'No matching record found. Please verify your PRN and email with your coordinator.' });
                return;
            }
            if (whitelisted[0].is_claimed) {
                res.status(400).json({ error: 'This account has already been claimed. Please log in.' });
                return;
            }

            const passwordHash = await hashPassword(password);
            const userResult = await query(
                "INSERT INTO users (email, password_hash, role, full_name) VALUES ($1, $2, 'STUDENT', $3) RETURNING user_id, email, role, full_name",
                [email, passwordHash, whitelisted[0].full_name]
            );
            const newUser = userResult[0];
            const { batch_year: parsedBatch, roll_no: parsedRoll } = parsePRN(prn_no);
            await query(
                'INSERT INTO student_profiles (student_id, prn_no, roll_no, batch_year) VALUES ($1, $2, $3, $4)',
                [newUser.user_id, prn_no, parsedRoll, parsedBatch]
            );
            await query('UPDATE student_whitelist SET is_claimed = true WHERE id = $1', [whitelisted[0].id]);

            const token = generateToken({ user_id: newUser.user_id, email: newUser.email, role: newUser.role });
            res.status(201).json({ user_id: newUser.user_id, email: newUser.email, full_name: newUser.full_name, role: newUser.role, prn_no, roll_no: parsedRoll, batch_year: parsedBatch, token });

        } else if (role === 'GUIDE' || role === 'COMMITTEE' || role === 'COORDINATOR') {
            // Faculty/Committee claim: verify email (+ optional employee_id) against faculty_whitelist
            let whereClause = 'WHERE email = $1 AND role = $2';
            const params: any[] = [email, role];

            if (employee_id) {
                whereClause += ' AND employee_id = $3';
                params.push(employee_id);
            }

            const whitelisted = await query(
                `SELECT id, is_claimed, full_name, role FROM faculty_whitelist ${whereClause}`,
                params
            );
            if (whitelisted.length === 0) {
                res.status(404).json({ error: 'No matching record found. Please verify your email with your administrator.' });
                return;
            }
            if (whitelisted[0].is_claimed) {
                res.status(400).json({ error: 'This account has already been claimed. Please log in.' });
                return;
            }

            const passwordHash = await hashPassword(password);
            const userResult = await query(
                'INSERT INTO users (email, password_hash, role, full_name) VALUES ($1, $2, $3, $4) RETURNING user_id, email, role, full_name',
                [email, passwordHash, role, whitelisted[0].full_name]
            );
            const newUser = userResult[0];

            // Create faculty profile for GUIDE role
            if (role === 'GUIDE') {
                const tagsArray = expertise_tags && Array.isArray(expertise_tags) ? expertise_tags : [];
                await query(
                    'INSERT INTO faculty_profiles (faculty_id, expertise_tags) VALUES ($1, $2)',
                    [newUser.user_id, tagsArray]
                );
            }

            await query('UPDATE faculty_whitelist SET is_claimed = true WHERE id = $1', [whitelisted[0].id]);

            const token = generateToken({ user_id: newUser.user_id, email: newUser.email, role: newUser.role });
            res.status(201).json({ user_id: newUser.user_id, email: newUser.email, full_name: newUser.full_name, role: newUser.role, token });

        } else {
            res.status(400).json({ error: 'Invalid role. Claim is available for STUDENT, GUIDE, COMMITTEE, and COORDINATOR.' });
        }
    } catch (error) {
        console.error('Claim account error:', error);
        res.status(500).json({ error: 'Failed to claim account' });
    }
}
