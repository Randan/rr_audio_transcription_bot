export interface EnvConfig {
  BOT_TOKEN: string;
  PORT: number;
  NODE_ENV: string;
  ADMIN_TELEGRAM_ID?: string;
  ASSEMBLY_AI_API_KEY: string;
  ASSEMBLY_AI_BASE_URL?: string;
}

function get(config: Record<string, unknown>, key: string): string | undefined {
  const v = config[key];
  return v === undefined ? undefined : String(v).trim() || undefined;
}

function requireKey(config: Record<string, unknown>, key: string): string {
  const value = get(config, key);
  if (value === undefined || value === '') {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

export function configValidationSchema(config: Record<string, unknown>): EnvConfig {
  const port = Number(get(config, 'PORT'));
  const portFinal = Number.isNaN(port) || port <= 0 ? 3000 : port;

  const rawBaseUrl = get(config, 'ASSEMBLY_AI_BASE_URL');
  const assemblyAiBaseUrl = rawBaseUrl
    ? rawBaseUrl.startsWith('http')
      ? rawBaseUrl
      : `https://${rawBaseUrl}`
    : undefined;

  return {
    BOT_TOKEN: requireKey(config, 'BOT_TOKEN'),
    PORT: portFinal,
    NODE_ENV: get(config, 'NODE_ENV') || 'production',
    ADMIN_TELEGRAM_ID: get(config, 'ADMIN_TELEGRAM_ID'),
    ASSEMBLY_AI_API_KEY: requireKey(config, 'ASSEMBLY_AI_API_KEY'),
    ASSEMBLY_AI_BASE_URL: assemblyAiBaseUrl,
  };
}
