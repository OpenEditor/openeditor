import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const darkModeAtom = atom(false);
// export const darkModeAtom = atomWithStorage(
//   'darkMode',
//   window?.matchMedia('(prefers-color-scheme: dark)')?.matches ?? false,
// );

export const measureAtom = atomWithStorage('measure', 55);
export const playerPositionAtom = atomWithStorage('playerPosition', { x: 2, y: 12 });
export const transportAtTopAtom = atomWithStorage('transportAtTop', true);
export const showFullTimecodeAtom = atomWithStorage('showFullTimecode', false);

export const debugModeAtom = atomWithStorage('debugMode', false);

export const ocrTimecodeAtom = atom<string | null | undefined>('00:00:00:00');
