/// <reference types="vite/client" />

declare namespace JSX {
  interface IntrinsicAttributes {
    key?: string | number;
  }

  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module "react" {
  export type Dispatch<T> = (value: T | ((previous: T) => T)) => void;
  export type SetStateAction<T> = T | ((previous: T) => T);
  export type MutableRefObject<T> = { current: T };

  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: unknown[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  export function useState<T>(initialState: T | (() => T)): [T, Dispatch<SetStateAction<T>>];

  const React: {
    StrictMode: (props: { children?: unknown }) => unknown;
  };

  export default React;
}

declare module "react/jsx-runtime" {
  export const Fragment: unknown;
  export function jsx(type: unknown, props: unknown, key?: unknown): unknown;
  export function jsxs(type: unknown, props: unknown, key?: unknown): unknown;
}

declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    render(children: unknown): void;
  };
}

declare module "*.css";

declare const process: {
  env: Record<string, string | undefined>;
};
