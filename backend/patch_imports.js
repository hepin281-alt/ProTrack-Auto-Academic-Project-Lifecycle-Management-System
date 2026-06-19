import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const controllersDir = path.join(__dirname, 'src', 'controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if handleDbError is called
    if (content.includes('handleDbError(') && !content.includes("import { handleDbError }")) {
        // Find last import
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
            const endOfLastImport = content.indexOf('\n', lastImportIndex);
            content = content.slice(0, endOfLastImport + 1) + "import { handleDbError } from '../utils/dbError.js';\n" + content.slice(endOfLastImport + 1);
        } else {
            content = "import { handleDbError } from '../utils/dbError.js';\n" + content;
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Fixed import in ${file}`);
    }
}
