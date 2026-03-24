/**
 * CSVImporter - Utility for importing CSV files into PWA storage
 * Handles CSV parsing, validation, and deduplication
 */

export class CSVImporter {
    /**
     * Parse CSV text into array of check-in objects
     * @param {string} csvText - Raw CSV content
     * @returns {Array} Array of parsed check-in objects
     */
    static parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV file is empty or invalid');
        }
        
        // Parse header
        const headers = this.parseCSVLine(lines[0]);
        console.log('[CSVImporter] Headers:', headers);
        
        // Parse data rows
        const checkins = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            try {
                const values = this.parseCSVLine(lines[i]);
                const checkin = {};
                
                headers.forEach((header, index) => {
                    if (values[index] !== undefined) {
                        checkin[header.trim()] = values[index].trim();
                    }
                });
                
                // Validate required fields
                if (checkin.checkin_id && checkin.venue_name) {
                    checkins.push(checkin);
                } else {
                    console.warn(`[CSVImporter] Row ${i + 1} missing required fields`, checkin);
                }
            } catch (error) {
                console.warn(`[CSVImporter] Error parsing row ${i + 1}:`, error.message);
            }
        }
        
        console.log(`[CSVImporter] Parsed ${checkins.length} valid check-ins`);
        return checkins;
    }
    
    /**
     * Parse a single CSV line, handling quoted values with commas
     * @param {string} line - CSV line
     * @returns {Array} Array of values
     */
    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        // Push last field
        result.push(current);
        
        return result;
    }
    
    /**
     * Validate check-in object
     * @param {Object} checkin - Check-in object
     * @returns {boolean} True if valid
     */
    static validate(checkin) {
        const required = ['checkin_id', 'venue_name', 'latitude', 'longitude'];
        
        for (const field of required) {
            if (!checkin[field]) {
                console.warn('[CSVImporter] Missing required field:', field);
                return false;
            }
        }
        
        // Validate coordinates
        const lat = parseFloat(checkin.latitude);
        const lng = parseFloat(checkin.longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
            console.warn('[CSVImporter] Invalid coordinates');
            return false;
        }
        
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.warn('[CSVImporter] Coordinates out of range');
            return false;
        }
        
        return true;
    }
    
    /**
     * Filter out duplicates based on checkin_id
     * @param {Array} newCheckins - Array of new check-ins
     * @param {Array} existingCheckins - Array of existing check-ins
     * @returns {Array} Filtered array of non-duplicate check-ins
     */
    static filterDuplicates(newCheckins, existingCheckins) {
        const existingIds = new Set(existingCheckins.map(c => c.checkin_id));
        const filtered = newCheckins.filter(c => !existingIds.has(c.checkin_id));
        
        console.log(`[CSVImporter] Filtered ${newCheckins.length - filtered.length} duplicates`);
        return filtered;
    }
}
