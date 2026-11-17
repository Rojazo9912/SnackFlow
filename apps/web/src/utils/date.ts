/**
 * Business timezone. MUST match BUSINESS_TIMEZONE in the backend
 * (apps/api/src/modules/reports/reports.service.ts). The whole point of these
 * helpers is that "today" and day boundaries are computed in the SAME timezone
 * on the client and the server, so the Dashboard and the Reports/History pages
 * never disagree about which calendar day a sale belongs to.
 *
 * TODO: make this a per-tenant setting instead of a hardcoded constant.
 */
export const BUSINESS_TIMEZONE = 'America/Mexico_City';

/**
 * UTC offset (in milliseconds) of the business timezone on a given calendar day.
 * Uses a noon-UTC reference to stay clear of DST switch edges, mirroring the
 * backend's getLocalDayBoundsUTC().
 */
const businessOffsetMs = (dateStr: string): number => {
    const ref = new Date(`${dateStr}T12:00:00Z`);
    const localHour = parseInt(
        new Intl.DateTimeFormat('en-US', {
            timeZone: BUSINESS_TIMEZONE,
            hour: 'numeric',
            hour12: false,
        }).format(ref),
        10,
    );
    // ref is 12:00 UTC; localHour is the business-local hour at that instant.
    return (localHour - 12) * 60 * 60 * 1000;
};

/**
 * ISO string for the start (00:00:00.000) of the given business-timezone day.
 * @param dateStr Date string in YYYY-MM-DD format
 */
export const getStartOfDayISO = (dateStr: string): string => {
    const utcMidnight = new Date(`${dateStr}T00:00:00.000Z`).getTime();
    return new Date(utcMidnight - businessOffsetMs(dateStr)).toISOString();
};

/**
 * ISO string for the end (23:59:59.999) of the given business-timezone day.
 * @param dateStr Date string in YYYY-MM-DD format
 */
export const getEndOfDayISO = (dateStr: string): string => {
    const utcEnd = new Date(`${dateStr}T23:59:59.999Z`).getTime();
    return new Date(utcEnd - businessOffsetMs(dateStr)).toISOString();
};

/**
 * Safely parses a YYYY-MM-DD date string into a Date object without the
 * UTC midnight offset bug. Uses T12:00:00 as noon anchor to stay on the
 * correct calendar day regardless of the user's UTC offset.
 * @param dateStr Date string in YYYY-MM-DD format
 */
export const parseLocalDate = (dateStr: string): Date => {
    return new Date(`${dateStr}T12:00:00`);
};

/**
 * Returns today's date as YYYY-MM-DD in the BUSINESS timezone (not the
 * device timezone). This is what keeps the default date on the Reports and
 * History pages aligned with the backend's idea of "today".
 */
export const getTodayLocal = (): string => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIMEZONE }).format(new Date());
};
