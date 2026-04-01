/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.png?url' {
    const value: string;
    export default value;
}

declare module '*.tmx?url' {
    const value: string;
    export default value;
}

declare module '*.tsx?url' {
    const value: string;
    export default value;
}
declare module '*.tssx?url' {
    const value: string;
    export default value;
}
