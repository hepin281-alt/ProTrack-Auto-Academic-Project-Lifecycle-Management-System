export function parsePRN(prn: string): { batch_year: number; roll_no: string } {
    if (!prn) return { batch_year: new Date().getFullYear(), roll_no: '' };
    
    let batch_year = new Date().getFullYear();
    let roll_no = prn;

    // Extract roll no from trailing digits
    const rollMatch = prn.match(/(\d+)$/);
    if (rollMatch) {
        roll_no = rollMatch[1];
    }

    // Extract batch year from leading digits (2 or 4 digits)
    const yearMatch = prn.match(/^(\d{2,4})/);
    if (yearMatch) {
        let y = yearMatch[1];
        if (y.length === 2) {
            batch_year = parseInt(`20${y}`, 10);
        } else if (y.length === 4) {
            batch_year = parseInt(y, 10);
        }
    }

    return { batch_year, roll_no };
}
