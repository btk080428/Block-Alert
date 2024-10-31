import fs from "fs";

export function getEnvVariable(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

export function getOptionalEnvVariable(key: string): string | null {
  const value = process.env[key];
  return value || null;
}

export function getCookieAuth(cookiePath: string): {
  username: string;
  password: string;
} {
  if (!fs.existsSync(cookiePath)) {
    throw new Error(`Cookie file not found at path: ${cookiePath}`);
  }

  const content = fs.readFileSync(cookiePath, "utf-8").trim();
  const [username, password] = content.split(":");

  if (!username || !password) {
    throw new Error(`Invalid cookie format in file: ${cookiePath}`);
  }

  return { username, password };
}
