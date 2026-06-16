export type ChatTurn = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolNotices?: string[];
  timestamp: number;
  model?: string;
  provider?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  updatedAt: number;
  turns: ChatTurn[];
};

const KEY_SESSIONS = 'meshisuke_chat_sessions';
const KEY_LEGACY = 'meshisuke_chat_history'; // For migration
const MAX_TURNS_PER_SESSION = 100;

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function loadSessions(): ChatSession[] {
  try {
    // Migrate legacy data if exists
    const legacyData = localStorage.getItem(KEY_LEGACY);
    if (legacyData) {
      const parsedLegacy = JSON.parse(legacyData);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        const migratedSession: ChatSession = {
          id: generateId(),
          title: '過去のチャット',
          updatedAt: Date.now(),
          turns: parsedLegacy,
        };
        const existingData = localStorage.getItem(KEY_SESSIONS);
        let existingSessions = [];
        if (existingData) {
          existingSessions = JSON.parse(existingData);
        }
        const newSessions = [...existingSessions, migratedSession];
        saveSessions(newSessions);
        localStorage.removeItem(KEY_LEGACY);
        return newSessions.sort((a, b) => b.updatedAt - a.updatedAt);
      }
      localStorage.removeItem(KEY_LEGACY);
    }

    const data = localStorage.getItem(KEY_SESSIONS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return [];
  } catch (e) {
    console.error('Failed to load chat sessions', e);
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]): void {
  try {
    const toStore = sessions.map((s) => ({
      ...s,
      turns: s.turns.slice(-MAX_TURNS_PER_SESSION),
    }));
    localStorage.setItem(KEY_SESSIONS, JSON.stringify(toStore));
  } catch (e) {
    console.error('Failed to save chat sessions', e);
  }
}

export function clearSessions(): void {
  localStorage.removeItem(KEY_SESSIONS);
  localStorage.removeItem(KEY_LEGACY);
}
