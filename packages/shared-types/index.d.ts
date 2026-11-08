export interface CatalogEntry {
    id: string;
    spotify_id: string | null;
    ytm_id: string | null;
    isrc: string | null;
    title: string;
    artist: string;
    title_norm: string;
    artist_norm: string;
    duration_ms: number;
    file_path: string;
    contributor: string;
    updated_at: string;
}
export interface CatalogFile {
    version: number;
    updated_at: string;
    songs: CatalogEntry[];
}
export type LyricsSource = 'brus-lyrics-verified' | 'lrclib-fallback';
export interface LyricsQueryParams {
    trackId?: string;
    title?: string;
    artist?: string;
    duration?: number | string;
    platform?: 'spotify' | 'ytm' | string;
}
export interface LyricsMetadata {
    id?: string;
    spotifyId?: string | null;
    ytmId?: string | null;
    isrc?: string | null;
    title: string;
    artist: string;
    durationMs: number;
    contributor?: string;
}
export interface SubmitLyricsPayload {
    metadata: LyricsMetadata;
    ttmlRaw: string;
    contributor: string;
}
export interface SubmitLyricsResponse {
    success: boolean;
    message: string;
    songId: string;
    action: 'committed' | 'queued' | 'stored';
    filePath?: string;
}
export interface CatalogPaginationResponse {
    songs: CatalogEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export type VocalAgent = 'v1' | 'v2';
export type SyllableRole = 'x-bg' | string;
export interface TTMLSyllable {
    begin: number;
    end: number;
    text: string;
    role?: SyllableRole;
}
export interface TTMLLine {
    id?: string;
    begin: number;
    end: number;
    agent: VocalAgent;
    role?: SyllableRole;
    text: string;
    syllables: TTMLSyllable[];
    backgroundVocals?: TTMLLine[];
}
export interface TTMLMetadata {
    title?: string;
    artist?: string;
    album?: string;
    durationMs?: number;
    spotifyId?: string;
    ytmId?: string;
    isrc?: string;
    contributor?: string;
}
export interface TTMLDocument {
    metadata: TTMLMetadata;
    lines: TTMLLine[];
    rawXml?: string;
}
export interface LrcLine {
    timeMs: number;
    text: string;
}
export interface LrcLibResponse {
    id: number;
    name: string;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string | null;
    syncedLyrics: string | null;
}
export declare function normalizeString(input: string): string;
export declare function formatTimestampTTML(ms: number): string;
export declare function parseTimestampTTML(timeStr: string): number;
//# sourceMappingURL=index.d.ts.map