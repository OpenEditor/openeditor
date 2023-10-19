/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="react-scripts" />

interface Window {
  Amplify: Amplify;
  // MediaInfo: MediaInfo;
  Indexes: Record<string, any> | undefined;
  handleFind: (e: any) => void;
  handleReplace: (value: string) => void;
  currentMatch: { [key: string]: any } | null;
}

// add slot to svg element
declare namespace JSX {
  interface IntrinsicElements {
    svg: any;
  }
}
