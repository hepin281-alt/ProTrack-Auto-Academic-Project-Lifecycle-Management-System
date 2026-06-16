/**
 * ProTrack PDF Generator — SPPU-format reports
 * Production-quality layout with institute header, styled tables, signatures.
 *
 * Exports:
 *   generateMarksheet(group, evaluations)  → Promise<Buffer>
 *   generateBatchReport(groups, year)      → Promise<Buffer>
 *   generateComplianceReport(records, year)→ Promise<Buffer>
 */

import PDFDocument from 'pdfkit';

// ── Shared palette ──────────────────────────────────────────────────────────────
const C = {
    navy:      '#1e3a5f',
    blue:      '#2563eb',
    lightBlue: '#bfdbfe',
    lightGray: '#f1f5f9',
    midGray:   '#64748b',
    border:    '#e2e8f0',
    dark:      '#1e293b',
    white:     '#ffffff',
    gold:      '#d97706',
    red:       '#dc2626',
    green:     '#16a34a',
};

function pt(mm: number) { return mm * 2.8346; }

// ── Layout helpers ────────────────────────────────────────────────────────────

function drawHeader(doc: PDFKit.PDFDocument, subtitle: string) {
    const W = doc.page.width;
    doc.rect(0, 0, W, pt(34)).fill(C.navy);

    // Circle emblem
    doc.circle(pt(16), pt(17), pt(10)).fillAndStroke(C.blue, C.white);
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9)
        .text('SPPU', pt(9), pt(14.5));

    // Title block
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(13)
        .text('Savitribai Phule Pune University', pt(31), pt(8), { width: W - pt(45) });
    doc.fillColor(C.lightBlue).font('Helvetica').fontSize(9)
        .text('Department of Computer Engineering — ProTrack System', pt(31), pt(18), { width: W - pt(45) });
    doc.fillColor('#93c5fd').font('Helvetica').fontSize(8)
        .text(subtitle, pt(31), pt(26), { width: W - pt(45) });

    doc.fillColor(C.lightBlue).font('Helvetica').fontSize(7)
        .text(
            `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}`,
            0, pt(28), { align: 'right', width: W - pt(5) }
        );
}

function sectionBar(doc: PDFKit.PDFDocument, label: string, y: number): number {
    const W = doc.page.width;
    const M = pt(10);
    doc.rect(M, y, W - M * 2, pt(7)).fill(C.lightGray);
    doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(8)
        .text(label.toUpperCase(), M + pt(3), y + pt(1.5));
    return y + pt(9);
}

function drawTable(
    doc: PDFKit.PDFDocument,
    cols: { header: string; w: number; align?: 'left'|'right'|'center' }[],
    rows: (string|number)[][][],   // rows of cells; each cell = [string, ?color]
    x: number, y: number,
    rowH = pt(7),
): number {
    const totalW = cols.reduce((s, c) => s + c.w, 0);

    // Header
    doc.rect(x, y, totalW, rowH).fill(C.navy);
    let cx = x;
    for (const col of cols) {
        doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.5)
            .text(col.header, cx + 3, y + pt(1.5), { width: col.w - 6, align: col.align ?? 'left' });
        cx += col.w;
    }
    y += rowH;

    for (let ri = 0; ri < rows.length; ri++) {
        const bg = ri % 2 === 0 ? C.white : C.lightGray;
        doc.rect(x, y, totalW, rowH).fill(bg).stroke(C.border);
        cx = x;
        rows[ri].forEach((cell, ci) => {
            const text  = String(cell[0] ?? '—');
            const color = (cell[1] as string) || C.dark;
            doc.fillColor(color).font('Helvetica').fontSize(8)
                .text(text, cx + 3, y + pt(1.5), {
                    width: cols[ci].w - 6,
                    align: cols[ci].align ?? 'left',
                    lineBreak: false,
                });
            cx += cols[ci].w;
        });
        y += rowH;
    }
    return y;
}

function kv(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number) {
    doc.fillColor(C.midGray).font('Helvetica').fontSize(8.5).text(label + ':', x, y);
    doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(8.5).text(value, x + pt(38), y);
}

function drawSignatures(doc: PDFKit.PDFDocument, names: string[]) {
    const W = doc.page.width;
    const H = doc.page.height;
    const yLine = H - pt(24);
    const slotW = (W - pt(20)) / names.length;

    doc.moveTo(pt(10), yLine - pt(4)).lineTo(W - pt(10), yLine - pt(4)).stroke(C.border);

    names.forEach((name, i) => {
        const sx = pt(10) + i * slotW;
        doc.moveTo(sx + pt(4), yLine + pt(10)).lineTo(sx + slotW - pt(4), yLine + pt(10)).stroke(C.midGray);
        doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(7.5)
            .text(name, sx, yLine + pt(12), { width: slotW, align: 'center' });
        doc.fillColor(C.midGray).font('Helvetica').fontSize(6.5)
            .text('Signature & Date', sx, yLine + pt(17), { width: slotW, align: 'center' });
    });
}

function pageFooter(doc: PDFKit.PDFDocument, label: string) {
    const W = doc.page.width;
    doc.fillColor(C.midGray).font('Helvetica').fontSize(6.5)
        .text(`ProTrack v1.0  |  ${label}  |  Confidential`, 0, doc.page.height - pt(8), { align: 'center', width: W });
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface GroupMember {
    full_name: string;
    prn_no: string;
    roll_no: string;
    email?: string;
}

export interface EvaluationRecord {
    phase: string;
    total_marks: number;
    rubric_scores?: Record<string, number>;
    evaluator_name?: string;
    created_at: string;
}

export interface GroupData {
    group_id: string;
    group_name: string;
    guide_name?: string;
    guide_email?: string;
    batch_year?: number;
    members: GroupMember[];
    evaluations?: EvaluationRecord[];
}

export interface BatchGroupData {
    group_name: string;
    guide_name: string;
    member_count: number;
    review1_marks?: number | null;
    review2_marks?: number | null;
    review3_marks?: number | null;
    final_marks?: number | null;
    total_marks: number;
}

export interface ComplianceData {
    group_name: string;
    guide_name?: string;
    guide_email?: string;
    weeks_active: number;
    logbooks_submitted: number;
    compliance_rate: number;
    status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MARKSHEET
// ─────────────────────────────────────────────────────────────────────────────

export function generateMarksheet(
    groupData: GroupData,
    evaluations?: EvaluationRecord[]
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
            const chunks: Buffer[] = [];
            doc.on('data', (c: Buffer) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const W = doc.page.width;
            const M = pt(10);
            const evals = evaluations ?? groupData.evaluations ?? [];

            // Header
            drawHeader(doc, 'STUDENT PROJECT MARKSHEET');
            let y = pt(40);

            // Group info
            y = sectionBar(doc, 'Group & Guide Information', y);
            kv(doc, 'Group Name', groupData.group_name, M, y);
            kv(doc, 'Guide', groupData.guide_name || 'TBD', W / 2, y); y += pt(9);
            kv(doc, 'Batch Year', String(groupData.batch_year ?? new Date().getFullYear()), M, y);
            kv(doc, 'Generated', new Date().toLocaleDateString('en-IN'), W / 2, y); y += pt(14);

            // Members
            y = sectionBar(doc, 'Student Members', y);
            y = drawTable(doc,
                [
                    { header: '#',   w: pt(10), align: 'center' },
                    { header: 'Full Name', w: pt(75) },
                    { header: 'PRN No.',  w: pt(48), align: 'center' },
                    { header: 'Roll No.', w: pt(37), align: 'center' },
                ],
                groupData.members.map((m, i) => [
                    [i + 1], [m.full_name], [m.prn_no || '—'], [m.roll_no || '—']
                ]),
                M, y
            );
            y += pt(10);

            // Marks table
            y = sectionBar(doc, 'Evaluation Marks (Out of 100)', y);

            const phaseOrder = ['REVIEW_1', 'REVIEW_2', 'REVIEW_3', 'FINAL'];
            const phaseLabel: Record<string, string> = {
                REVIEW_1: 'Review 1', REVIEW_2: 'Review 2',
                REVIEW_3: 'Review 3', FINAL: 'Final / Viva',
            };

            const marksRows = phaseOrder.map(phase => {
                const ev = evals.find(e => e.phase === phase);
                const marks = ev ? Number(ev.total_marks).toFixed(2) : '—';
                const color = ev
                    ? (Number(ev.total_marks) >= 80 ? C.green : Number(ev.total_marks) >= 40 ? C.dark : C.red)
                    : C.midGray;
                return [
                    [phaseLabel[phase]],
                    [marks, color],
                    [ev?.evaluator_name ?? '—'],
                    [ev ? new Date(ev.created_at).toLocaleDateString('en-IN') : 'Pending'],
                ];
            });

            y = drawTable(doc,
                [
                    { header: 'Phase',        w: pt(42) },
                    { header: 'Marks',        w: pt(28), align: 'center' },
                    { header: 'Evaluated By', w: pt(60) },
                    { header: 'Date',         w: pt(40), align: 'center' },
                ],
                marksRows, M, y
            );

            // Cumulative total band
            const available = evals.filter(e => e.total_marks != null);
            const avg = available.length > 0
                ? (available.reduce((s, e) => s + Number(e.total_marks), 0) / available.length).toFixed(2)
                : '—';
            const totalW = pt(170);
            doc.rect(M, y, totalW, pt(9)).fill(C.navy);
            doc.fillColor(C.white).font('Helvetica-Bold').fontSize(9)
                .text('CUMULATIVE AVERAGE', M + 4, y + pt(1.5), { width: pt(80) });
            doc.fillColor(C.gold).font('Helvetica-Bold').fontSize(11)
                .text(avg, M + pt(42), y, { width: pt(28), align: 'center' });
            y += pt(9) + pt(10);

            // Rubric breakdown for first evaluation
            const withRubric = evals.find(e => e.rubric_scores && Object.keys(e.rubric_scores).length > 0);
            if (withRubric) {
                y = sectionBar(doc, `Rubric Score Breakdown — ${phaseLabel[withRubric.phase]}`, y);
                const rubricRows = Object.entries(withRubric.rubric_scores!).map(([k, v]) => [
                    [k], [String(v), C.blue]
                ]);
                y = drawTable(doc,
                    [{ header: 'Criterion', w: pt(130) }, { header: 'Score', w: pt(40), align: 'center' }],
                    rubricRows, M, y
                );
                y += pt(8);
            }

            // Signatures & footer
            drawSignatures(doc, ['Guide', 'Committee Member', 'Coordinator', 'HOD']);
            pageFooter(doc, `Group ID: ${groupData.group_id}`);
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BATCH REPORT
// ─────────────────────────────────────────────────────────────────────────────

export function generateBatchReport(
    allGroupsData: BatchGroupData[],
    batchYear?: number
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, bufferPages: true });
            const chunks: Buffer[] = [];
            doc.on('data', (c: Buffer) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const W = doc.page.width;
            const M = pt(10);
            const year = batchYear ?? new Date().getFullYear();

            drawHeader(doc, `BATCH MARKS SUMMARY REPORT — Academic Year ${year}`);
            let y = pt(40);

            // Stats band
            const total  = allGroupsData.length;
            const passed = allGroupsData.filter(g => g.total_marks >= 40).length;
            const avgMk  = total > 0
                ? (allGroupsData.reduce((s, g) => s + g.total_marks, 0) / total).toFixed(1)
                : '0';
            const statW  = (W - M * 2) / 4;
            doc.rect(M, y, W - M * 2, pt(14)).fill(C.lightGray);
            [
                { label: 'Total Groups', val: String(total) },
                { label: 'Passed (≥40)', val: String(passed) },
                { label: 'Avg Score',    val: avgMk },
                { label: 'Pass Rate',    val: total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : '—' },
            ].forEach((s, i) => {
                const sx = M + i * statW;
                doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(14)
                    .text(s.val, sx, y + pt(1), { width: statW, align: 'center' });
                doc.fillColor(C.midGray).font('Helvetica').fontSize(7)
                    .text(s.label, sx, y + pt(8.5), { width: statW, align: 'center' });
            });
            y += pt(20);

            y = sectionBar(doc, 'Group-wise Marks', y);

            // Paginate rows
            const ROWS_PER_PAGE = 22;
            const allRows = allGroupsData.map((g, i) => [
                [i + 1],
                [g.group_name.slice(0, 30)],
                [g.guide_name.slice(0, 22)],
                [String(g.member_count)],
                [g.review1_marks != null ? String(g.review1_marks.toFixed(1)) : '—'],
                [g.review2_marks != null ? String(g.review2_marks.toFixed(1)) : '—'],
                [g.review3_marks != null ? String(g.review3_marks.toFixed(1)) : '—'],
                [g.final_marks   != null ? String(g.final_marks.toFixed(1))   : '—'],
                [g.total_marks.toFixed(1), g.total_marks >= 40 ? C.green : C.red],
            ]);

            const cols = [
                { header: '#',     w: pt(10), align: 'center' as const },
                { header: 'Group', w: pt(65) },
                { header: 'Guide', w: pt(52) },
                { header: 'Mem',   w: pt(14), align: 'center' as const },
                { header: 'R1',    w: pt(20), align: 'center' as const },
                { header: 'R2',    w: pt(20), align: 'center' as const },
                { header: 'R3',    w: pt(20), align: 'center' as const },
                { header: 'Final', w: pt(20), align: 'center' as const },
                { header: 'Avg',   w: pt(20), align: 'center' as const },
            ];

            for (let pg = 0; pg < Math.ceil(allRows.length / ROWS_PER_PAGE); pg++) {
                if (pg > 0) { doc.addPage(); y = pt(40); }
                const slice = allRows.slice(pg * ROWS_PER_PAGE, (pg + 1) * ROWS_PER_PAGE);
                y = drawTable(doc, cols, slice, M, y);
            }

            drawSignatures(doc, ['Coordinator', 'HOD', 'Principal']);
            pageFooter(doc, `Batch ${year} Summary`);
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPLIANCE REPORT
// ─────────────────────────────────────────────────────────────────────────────

export function generateComplianceReport(
    complianceData: ComplianceData[],
    batchYear?: number
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
            const chunks: Buffer[] = [];
            doc.on('data', (c: Buffer) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const W = doc.page.width;
            const M = pt(10);
            const year = batchYear ?? new Date().getFullYear();

            drawHeader(doc, `LOGBOOK COMPLIANCE REPORT — Batch Year ${year}`);
            let y = pt(40);

            // Stats band
            const total     = complianceData.length;
            const compliant = complianceData.filter(r => r.compliance_rate >= 80).length;
            const atRisk    = complianceData.filter(r => r.compliance_rate < 60).length;
            const avg       = total > 0
                ? (complianceData.reduce((s, r) => s + r.compliance_rate, 0) / total).toFixed(1)
                : '0';
            const statW = (W - M * 2) / 4;
            doc.rect(M, y, W - M * 2, pt(14)).fill(C.lightGray);
            [
                { label: 'Total Groups',    val: String(total) },
                { label: '≥80% Compliant',  val: String(compliant) },
                { label: 'Avg Compliance',  val: `${avg}%` },
                { label: 'At Risk (<60%)',  val: String(atRisk) },
            ].forEach((s, i) => {
                const sx = M + i * statW;
                doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(14)
                    .text(s.val, sx, y + pt(1), { width: statW, align: 'center' });
                doc.fillColor(C.midGray).font('Helvetica').fontSize(7)
                    .text(s.label, sx, y + pt(8.5), { width: statW, align: 'center' });
            });
            y += pt(20);

            y = sectionBar(doc, 'Per-Group Logbook Compliance', y);

            const rows = complianceData.map((r, i) => {
                const rateColor = r.compliance_rate >= 80 ? C.green : r.compliance_rate >= 60 ? C.gold : C.red;
                const guideName = r.guide_name || (r.guide_email ? r.guide_email.split('@')[0] : 'TBD');
                return [
                    [i + 1],
                    [r.group_name.slice(0, 32)],
                    [guideName.slice(0, 24)],
                    [String(r.weeks_active)],
                    [String(r.logbooks_submitted)],
                    [`${r.compliance_rate.toFixed(1)}%`, rateColor],
                    [r.status.replace('_', ' ').toUpperCase(), rateColor],
                ];
            });

            const ROWS_PER_PAGE = 26;
            const cols = [
                { header: '#',           w: pt(10), align: 'center' as const },
                { header: 'Group',       w: pt(65) },
                { header: 'Guide',       w: pt(52) },
                { header: 'Wks',         w: pt(14), align: 'center' as const },
                { header: 'Submitted',   w: pt(22), align: 'center' as const },
                { header: 'Compliance',  w: pt(24), align: 'center' as const },
                { header: 'Status',      w: pt(28), align: 'center' as const },
            ];

            for (let pg = 0; pg < Math.ceil(rows.length / ROWS_PER_PAGE); pg++) {
                if (pg > 0) { doc.addPage(); y = pt(40); }
                const slice = rows.slice(pg * ROWS_PER_PAGE, (pg + 1) * ROWS_PER_PAGE);
                y = drawTable(doc, cols, slice, M, y);
            }

            // Legend
            y += pt(8);
            doc.fillColor(C.dark).font('Helvetica-Bold').fontSize(8)
                .text('Status Legend:', M, y); y += pt(6);
            [
                ['🟢 ≥80%',  'ON TRACK — good compliance',        C.green],
                ['🟡 60-79%', 'WARNING — needs attention',         C.gold],
                ['🔴 <60%',  'AT RISK — immediate action required', C.red],
            ].forEach(([badge, desc, color]) => {
                doc.fillColor(color as string).font('Helvetica-Bold').fontSize(7.5)
                    .text(badge as string, M, y, { continued: true });
                doc.fillColor(C.midGray).font('Helvetica').fontSize(7.5)
                    .text(`  ${desc}`, { continued: false });
                y += pt(5.5);
            });

            drawSignatures(doc, ['Coordinator', 'HOD']);
            pageFooter(doc, `Compliance Report — Batch ${year}`);
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}
