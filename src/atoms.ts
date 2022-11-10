import { atomWithStorage } from 'jotai/utils';

export const darkModeAtom = atomWithStorage('darkMode', window.matchMedia('(prefers-color-scheme: dark)').matches);
export const debugModeAtom = atomWithStorage('debugMode', false);
export const playerPositionAtom = atomWithStorage('playerPosition', { x: 20, y: 0 });
