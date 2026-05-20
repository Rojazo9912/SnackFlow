
/**
 * Converts a local date string (YYYY-MM-DD) to an ISO string representing
 * the start of that day in the local timezone (00:00:00.000).
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns ISO string
 */
export const getStartOfDayISO = (dateStr: string): string => {
    // We append T00:00:00 to create a local date object (not UTC)
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
    const localDate = new Date(`${dateStr}T23:59:59.999`);
    return localDate.toISOString();
};

/**
 * Safely parses a YYYY-MM-DD date string into a Date object without the
 * UTC midnight offset bug. Uses T12:00:00 as noon anchor to stay on the
 * correct calendar day regardless of the user's UTC offset.
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Date object representing that calendar day
 */
export const parseLocalDate = (dateStr: string): Date => {
    return new Date(`${dateStr}T12:00:00`);
};

/**
 * Returns today's date as YYYY-MM-DD in the local timezone.
 * Uses Intl.DateTimeFormat to avoid any locale-dependent formatting.
 */
export const getTodayLocal = (): string => {
    return new Intl.DateTimeFormat('en-CA').format(new Date());
};
