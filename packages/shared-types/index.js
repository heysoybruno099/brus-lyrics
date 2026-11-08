export function normalizeString(input) {
    if (!input)
        return '';
    return input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s*-\s*(?:remastered|remaster|live|single version|mono|stereo|bonus track).*/gi, '')
        .replace(/\((?:feat\.|featuring|ft\.|with|remastered|remaster|live|official).*?\)/gi, '')
        .replace(/\[(?:feat\.|featuring|ft\.|with|remastered|remaster|live|official).*?\]/gi, '')
        .replace(/[^\w\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
export function formatTimestampTTML(ms) {
    if (ms < 0)
        ms = 0;
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const mmm = String(milliseconds).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${mmm}`;
}
export function parseTimestampTTML(timeStr) {
    if (!timeStr)
        return 0;
    const trimmed = timeStr.trim();
    if (trimmed.endsWith('s')) {
        return Math.round(parseFloat(trimmed.slice(0, -1)) * 1000);
    }
    const parts = trimmed.split(':');
    if (parts.length === 3) {
        const hours = parseInt(parts[0] || '0', 10);
        const minutes = parseInt(parts[1] || '0', 10);
        const secParts = (parts[2] || '0').split('.');
        const seconds = parseInt(secParts[0] || '0', 10);
        const ms = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
        return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms;
    }
    else if (parts.length === 2) {
        const minutes = parseInt(parts[0] || '0', 10);
        const secParts = (parts[1] || '0').split('.');
        const seconds = parseInt(secParts[0] || '0', 10);
        const ms = secParts[1] ? parseInt(secParts[1].padEnd(3, '0').slice(0, 3), 10) : 0;
        return minutes * 60000 + seconds * 1000 + ms;
    }
    const numeric = parseFloat(trimmed);
    return isNaN(numeric) ? 0 : Math.round(numeric * 1000);
}
//# sourceMappingURL=index.js.map