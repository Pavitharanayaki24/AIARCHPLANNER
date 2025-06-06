// src/store.ts
import { create } from 'zustand';
import type { Flow, Store as FlowStore } from './types';

// Define XYPosition interface directly
interface XYPosition {
  x: number;
  y: number;
}

const initFlow: Flow = {
  width: 800,
  height: 600,
  title: '',
  subtitle: '',
  position: 'top-left',
  font: 'Arial',
  nodes: [
    { id: '1', width: 100, height: 40, position: { x: 0, y: 0 } },
    { id: '2', width: 100, height: 40, position: { x: 25, y: 100 } },
  ],
  edges: [{ id: '1-2', source: '1', target: '2' }],
};

type Store = {
  // Flow state
  flow: Flow | null;
  setFlow: (flow: Flow) => void;

  // Flow format type
  type: 'html' | 'xml' | 'json';
  setType: (type: 'html' | 'xml' | 'json') => void;

  // Connection line for editable edges
  connectionLinePath: XYPosition[];
  setConnectionLinePath: (connectionLinePath: XYPosition[]) => void;
};

export const useStore = create<Store>((set) => ({
  flow: initFlow,
  setFlow: (flow) => set({ flow }),

  type: 'html',
  setType: (type) => set({ type }),

  connectionLinePath: [],
  setConnectionLinePath: (connectionLinePath) => set({ connectionLinePath }),
}));

// Selectors/hooks
export const useFlow = () => useStore((state) => state.flow);
export const useStoreActions = () =>
  useStore(({ setFlow, setType, setConnectionLinePath }) => ({
    setFlow,
    setType,
    setConnectionLinePath,
  }));
export const useStoreState = () => useStore((state) => state.flow);