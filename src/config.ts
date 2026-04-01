interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
}

declare global {
  interface Window {
    __env__?: Partial<EnvConfig>;
  }
}

const runtimeEnv = window.__env__ || {};

export const env: EnvConfig = {
  SUPABASE_URL: runtimeEnv.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: runtimeEnv.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_KEY: runtimeEnv.SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_SERVICE_KEY || '',
};
