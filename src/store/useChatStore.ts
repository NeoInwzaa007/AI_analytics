import { create } from 'zustand';

interface ChatStore {
    activeSessionId: string | null;
    setActiveSession: (id: string | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
    activeSessionId: null,
    setActiveSession: (id) => set({ activeSessionId: id }),
}));
