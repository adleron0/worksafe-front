/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_PAYLOAD_ACCESS_SECRET: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}