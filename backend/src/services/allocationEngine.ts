/**
 * Guide Allocation Engine
 *
 * Score Formula (0–100):
 *   Expertise Match   = 40%  (Jaccard similarity: |guide_tags ∩ domain_tags| / |guide_tags ∪ domain_tags|)
 *   Workload Score    = 30%  ((max_workload - current_workload) / max_workload)
 *   Student Preference= 20%  (1 if preferred_guide_id matches, else 0)
 *   Past Performance  = 10%  (avg_rating / 5, defaults to 0.6 if no ratings)
 */

import { query } from '../config/database.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GuideCandidate {
    faculty_id: string;
    full_name: string;
    email: string;
    expertise_tags: string[];
    current_workload: number;
    max_workload: number;
    avg_rating: number;   // 1–5, or null if no ratings
}

export interface GroupToAllocate {
    group_id: string;
    group_name: string;
    domain_tags: string[];        // from latest proposal
    preferred_guide_id: string | null;
}

export interface ScoredGuide extends GuideCandidate {
    score: number;                // 0–100
    score_breakdown: {
        expertise_match: number;  // 0–40
        workload_score: number;   // 0–30
        preference_score: number; // 0–20
        performance_score: number;// 0–10
    };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function jaccardSimilarity(a: string[], b: string[]): number {
    if (a.length === 0 && b.length === 0) return 0;
    const setA = new Set(a.map(t => t.toLowerCase().trim()));
    const setB = new Set(b.map(t => t.toLowerCase().trim()));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export function scoreGuide(guide: GuideCandidate, group: GroupToAllocate): ScoredGuide {
    // 1. Expertise match (40 pts)
    const jaccard = jaccardSimilarity(guide.expertise_tags, group.domain_tags);
    const expertise_match = parseFloat((jaccard * 40).toFixed(2));

    // 2. Workload score (30 pts) — fuller guides score lower
    const available = guide.max_workload - guide.current_workload;
    const workload_score = parseFloat(
        (guide.max_workload > 0 ? (available / guide.max_workload) * 30 : 0).toFixed(2)
    );

    // 3. Student preference (20 pts) — exact guide match
    const preference_score = group.preferred_guide_id === guide.faculty_id ? 20 : 0;

    // 4. Past performance (10 pts) — default 60% (3/5) if no ratings
    const normalizedRating = guide.avg_rating > 0 ? guide.avg_rating / 5 : 0.6;
    const performance_score = parseFloat((normalizedRating * 10).toFixed(2));

    const score = parseFloat(
        (expertise_match + workload_score + preference_score + performance_score).toFixed(2)
    );

    return {
        ...guide,
        score,
        score_breakdown: { expertise_match, workload_score, preference_score, performance_score }
    };
}

// ─── Data Fetching ───────────────────────────────────────────────────────────

export async function fetchAvailableGuides(): Promise<GuideCandidate[]> {
    const rows = await query(
        `SELECT
            f.faculty_id,
            u.full_name,
            u.email,
            f.expertise_tags,
            f.current_workload,
            f.max_workload,
            COALESCE(AVG(gr.rating), 0) as avg_rating
         FROM faculty_profiles f
         JOIN users u ON f.faculty_id = u.user_id
         LEFT JOIN guide_ratings gr ON f.faculty_id = gr.guide_id
         WHERE f.current_workload < f.max_workload
         GROUP BY f.faculty_id, u.full_name, u.email, f.expertise_tags, f.current_workload, f.max_workload
         ORDER BY f.current_workload ASC`
    );
    return rows as GuideCandidate[];
}

export async function fetchGroupsForAllocation(groupIds?: string[]): Promise<GroupToAllocate[]> {
    let sql = `
        SELECT
            g.group_id,
            g.group_name,
            g.preferred_guide_id,
            COALESCE(
                (SELECT pp.domain_tags
                 FROM project_proposals pp
                 WHERE pp.group_id = g.group_id AND pp.is_approved = true
                 LIMIT 1),
                '{}'::text[]
            ) as domain_tags
        FROM project_groups g
        WHERE g.guide_id IS NULL AND g.status = 'WAITING_ALLOCATION'`;

    const params: string[] = [];
    if (groupIds && groupIds.length > 0) {
        sql += ` AND g.group_id = ANY($1)`;
        params.push(groupIds as any);
    }

    sql += ' ORDER BY g.created_at ASC';
    const rows = await query(sql, params.length > 0 ? params : undefined);
    return rows as GroupToAllocate[];
}

// ─── Single Group Recommendation ────────────────────────────────────────────

export async function rankGuidesForGroup(groupId: string): Promise<ScoredGuide[]> {
    const [guides, groups] = await Promise.all([
        fetchAvailableGuides(),
        fetchGroupsForAllocation([groupId])
    ]);

    if (groups.length === 0) return [];
    const group = groups[0];

    return guides
        .map(guide => scoreGuide(guide, group))
        .sort((a, b) => b.score - a.score);
}

// ─── Batch Allocation ────────────────────────────────────────────────────────

export interface BatchAllocationResult {
    group_id: string;
    group_name: string;
    assigned_guide_id: string | null;
    assigned_guide_name: string | null;
    score: number | null;
    score_breakdown: ScoredGuide['score_breakdown'] | null;
    status: 'ASSIGNED' | 'NO_GUIDE_AVAILABLE' | 'ALREADY_ASSIGNED';
}

export async function runBatchAllocation(
    performedById: string,
    specificGroupIds?: string[]
): Promise<BatchAllocationResult[]> {
    const groups = await fetchGroupsForAllocation(specificGroupIds);
    const results: BatchAllocationResult[] = [];

    for (const group of groups) {
        // Get fresh guide list each iteration (workload changes after each assignment)
        const guides = await fetchAvailableGuides();
        if (guides.length === 0) {
            results.push({
                group_id: group.group_id,
                group_name: group.group_name,
                assigned_guide_id: null,
                assigned_guide_name: null,
                score: null,
                score_breakdown: null,
                status: 'NO_GUIDE_AVAILABLE'
            });
            continue;
        }

        const ranked = guides
            .map(g => scoreGuide(g, group))
            .sort((a, b) => b.score - a.score);

        const best = ranked[0];

        // Assign guide in DB
        await query(
            `UPDATE project_groups
             SET guide_id = $1, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
             WHERE group_id = $2`,
            [best.faculty_id, group.group_id]
        );

        // Increment workload
        await query(
            `UPDATE faculty_profiles
             SET current_workload = current_workload + 1
             WHERE faculty_id = $1`,
            [best.faculty_id]
        );

        // Write audit log
        await query(
            `INSERT INTO allocation_audit
                (group_id, guide_id, action, performed_by, score_breakdown, notes)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                group.group_id,
                best.faculty_id,
                'BATCH',
                performedById,
                JSON.stringify({
                    final_score: best.score,
                    ...best.score_breakdown,
                    guide_tags: best.expertise_tags,
                    group_tags: group.domain_tags
                }),
                `Batch auto-allocation. Score: ${best.score}/100`
            ]
        );

        results.push({
            group_id: group.group_id,
            group_name: group.group_name,
            assigned_guide_id: best.faculty_id,
            assigned_guide_name: best.full_name,
            score: best.score,
            score_breakdown: best.score_breakdown,
            status: 'ASSIGNED'
        });
    }

    return results;
}
