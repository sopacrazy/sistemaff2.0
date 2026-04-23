/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Adicione outras variáveis VITE_ aqui, se necessário
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
