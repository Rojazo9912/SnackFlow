
/**
 * Converts a loca date string (YYYY-MM-DD) to an ISO string representing
 * the start of that day in the local timezone (00:00:00.000).
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns ISO string
 */
export const getStartOfDayISO = (dateStr: string): string => {
    const date = new Date(dateStr);
    // Adjust for timezone offset to ensure we get 00:00:00 local time
    // We append T00:00:00 to the date string to create a local date object
    const localDate = new Date(`${dateStr}T00:00:00`);
    return localDate.toISOString();
};

/**
 * Converts a local date string (YYYY-MM-DD) to an ISO string representing
 * the end of that day in the local timezone (23:59:59.999).
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns ISO string
 */
export const getEndOfDayISO = (dateStr: string): string => {
    // We append T23:59:59.999 to the date string
    const localDate = new Date(`${dateStr}T23:59:59.999`);
    return localDate.toISOString();
};
