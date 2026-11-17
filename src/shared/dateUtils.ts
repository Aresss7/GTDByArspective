/**
 * Formats date into DD.MM.YYYY (дд.мм.гггг)
 * Accepts YYYY-MM-DD string, ISO date string, or Date object.
 */
export function formatDateDDMMYYYY(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Fast match for YYYY-MM-DD (e.g. 2026-11-22 or 2026-11-22T...)
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}.${match[2]}.${match[1]}`;
    }
    // If already in DD.MM.YYYY
    if (/^\d{2}\.\d{2}\.\d{4}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    }
    return trimmed;
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}.${month}.${year}`;
  }

  return '';
}
