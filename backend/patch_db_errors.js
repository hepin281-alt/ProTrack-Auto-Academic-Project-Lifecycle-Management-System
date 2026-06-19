import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const controllersDir = path.join(__dirname, 'src', 'controllers');

const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

const catchRegex = /catch\s*\((error(?:\s*:\s*any)?)\)\s*\{[\s\S]*?res\.status\(500\)\.json\(\{\s*error\s*:\s*['"](.*?)['"]\s*\}\);?\s*\}/g;

let updatedFiles = 0;

for (const file of files) {
    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Skip if already heavily migrated (we did some manually)
    if (file === 'analytics.ts' || file === 'evaluations.ts' || file === 'guide.ts' || file === 'logbooks.ts' || file === 'milestones.ts' || file === 'tasks.ts' || file === 'peerEvaluations.ts' || file === 'rubrics.ts' || file === 'committee.ts') {
        continue;
    }
    
    let modified = false;

    // Check notes.ts which has a special format
    if (file === 'notes.ts') {
        content = content.replace(/catch\s*\(\s*error\s*:\s*any\s*\)\s*\{[\s\S]*?res\.status\(500\)\.json\(\{[\s\S]*?\}\);?\s*\}/g, (match) => {
            modified = true;
            return `catch (error: any) {
        handleDbError(error, res, 'notes operation', {});
    }`;
        });
    } else if (file === 'topicApproval.ts') {
         // Has an inner catch that doesn't return 500, we should only match the ones with res.status(500)
         content = content.replace(/catch\s*\((error(?:\s*:\s*any)?)\)\s*\{[\s\S]*?res\.status\(500\)\.json\(\{\s*error\s*:\s*['"](.*?)['"]\s*\}\);?\s*\}/g, (match, errVar, errorMsg) => {
             modified = true;
             // Determine fallback based on error msg or context
             let fallback = '{}';
             if (errorMsg.includes('fetch') || errorMsg.includes('search') || errorMsg.includes('compare')) {
                 fallback = '[]';
             }
             if (errorMsg === 'Failed to compare topics') {
                fallback = '{ results: [], count: 0 }';
             } else if (errorMsg === 'Failed to fetch topics') {
                fallback = '{ total: 0, proposals: [] }';
             }
             return `catch (error: any) {\n        handleDbError(error, res, '${errorMsg.toLowerCase()}', ${fallback});\n    }`;
         });
    } else {
        content = content.replace(catchRegex, (match, errVar, errorMsg) => {
            modified = true;
            let fallback = '{}';
            if (errorMsg.includes('fetch') || errorMsg.includes('search')) {
                fallback = '[]';
            }
            if (file === 'allocations.ts' && errorMsg === 'Failed to fetch pending groups') fallback = '{ total_pending: 0, groups: [] }';
            if (file === 'allocations.ts' && errorMsg === 'Failed to fetch available guides') fallback = '{ total_available: 0, guides: [] }';
            if (file === 'allocations.ts' && errorMsg === 'Failed to rank guides') fallback = '{ group_id: req.params.group_id, ranked: [] }';
            if (file === 'allocations.ts' && errorMsg === 'Failed to fetch audit logs') fallback = '{ logs: [] }';
            if (file === 'allocations.ts' && errorMsg === 'Failed to fetch ratings') fallback = '{ ratings: [] }';
            if (file === 'allocations.ts' && errorMsg === 'Failed to fetch guide groups') fallback = '{ guide_id: req.params.guide_id, total_groups: 0, groups: [] }';
            
            return `catch (error: any) {
        handleDbError(error, res, '${errorMsg.toLowerCase()}', ${fallback});
    }`;
        });
    }

    if (modified) {
        // Add import if not exists
        if (!content.includes('handleDbError')) {
            // Find last import
            const lastImportIndex = content.lastIndexOf('import ');
            if (lastImportIndex !== -1) {
                const endOfLastImport = content.indexOf('\n', lastImportIndex);
                content = content.slice(0, endOfLastImport + 1) + "import { handleDbError } from '../utils/dbError.js';\n" + content.slice(endOfLastImport + 1);
            } else {
                content = "import { handleDbError } from '../utils/dbError.js';\n" + content;
            }
        }
        
        fs.writeFileSync(filePath, content, 'utf-8');
        updatedFiles++;
        console.log(`Updated ${file}`);
    }
}

console.log(`Total files updated: ${updatedFiles}`);
