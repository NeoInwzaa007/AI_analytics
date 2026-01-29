import { create } from 'zustand';

interface ConnectionState {
    activeConnectionId: number | null;
    connectionName: string | null;
    isConnected: boolean;
    setConnection: (id: number, name: string) => void;
    clearConnection: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
    activeConnectionId: null,
    connectionName: null,
    isConnected: false,
    setConnection: (id, name) => set({
        activeConnectionId: id,
        connectionName: name,
        isConnected: true
    }),
    clearConnection: () => set({
        activeConnectionId: null,
        connectionName: null,
        isConnected: false
    }),
}));
