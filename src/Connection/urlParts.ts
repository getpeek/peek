export interface ParsedConnectionUrl {
  scheme: string;
  user: string;
  password: string;
  host: string;
  database: string;
}

export const parseConnectionUrl = (raw: string): ParsedConnectionUrl | null => {
  try {
    const url = new URL(raw);
    return {
      scheme: url.protocol.replace(/:$/u, ""),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.host,
      database: url.pathname.replace(/^\//u, ""),
    };
  } catch {
    return null;
  }
};
