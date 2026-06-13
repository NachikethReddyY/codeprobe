import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile, chmod } from 'fs/promises';
import path from 'path';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import chalk from 'chalk';
import { PATHS, FILE_PERMISSIONS } from '../shared/constants.js';

interface ConfigData {
  github_token?: string;
  bright_data_api_key?: string;
  daytona_api_key?: string;
  nosana_api_key?: string;
  [key: string]: string | undefined;
}

// Key derivation for AES-256-GCM
// Recommendation: Use machine ID for cross-session consistency
// For MVP: Use a fixed salt (in production, store per-machine)
const ENCRYPTION_SALT = 'codeprobe-mvp-salt-2026';
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const TAG_LENGTH = 16; // GCM tag length

function getMachineKey(): Buffer {
  // Derive key from machine fingerprint + salt
  // For MVP: Use hostname as fingerprint (acceptable, not perfect)
  const fingerprint = `${process.platform}-${process.arch}-${process.pid}`;
  return scryptSync(fingerprint, ENCRYPTION_SALT, KEY_LENGTH);
}

function encryptToken(token: string): string {
  try {
    const key = getMachineKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    // Format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.warn(
      chalk.yellow(
        '⚠️  Token encryption failed. Falling back to plaintext (not secure).\n' +
          'Warning: ~/.codeprobe/config.json contains unencrypted secrets.'
      )
    );
    return token;
  }
}

function decryptToken(encryptedToken: string): string {
  try {
    // Check if token is already plaintext (fallback case)
    if (!encryptedToken.includes(':')) {
      return encryptedToken;
    }

    const [ivHex, tagHex, encrypted] = encryptedToken.split(':');
    const key = getMachineKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Token decryption failed. Token may be corrupted.'));
    return encryptedToken;
  }
}

export async function ensureConfigDir(): Promise<void> {
  if (!existsSync(PATHS.CODEPROBE_DIR)) {
    mkdirSync(PATHS.CODEPROBE_DIR, { mode: FILE_PERMISSIONS.DIR, recursive: true });
  }
  if (!existsSync(PATHS.SCANS_DIR)) {
    mkdirSync(PATHS.SCANS_DIR, { mode: FILE_PERMISSIONS.DIR, recursive: true });
  }

  // Ensure permissions are correct
  try {
    await chmod(PATHS.CODEPROBE_DIR, FILE_PERMISSIONS.DIR);
    await chmod(PATHS.SCANS_DIR, FILE_PERMISSIONS.DIR);
  } catch (error) {
    // Ignore permission errors on some filesystems
  }
}

async function loadConfig(): Promise<ConfigData> {
  try {
    if (!existsSync(PATHS.CONFIG_FILE)) {
      return {};
    }

    const content = await readFile(PATHS.CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Failed to load config file.'));
    return {};
  }
}

async function saveConfig(config: ConfigData): Promise<void> {
  await ensureConfigDir();

  const content = JSON.stringify(config, null, 2);
  await writeFile(PATHS.CONFIG_FILE, content, 'utf-8');
  await chmod(PATHS.CONFIG_FILE, FILE_PERMISSIONS.FILE);
}

export async function getConfig(key?: string): Promise<ConfigData | string | undefined> {
  const config = await loadConfig();

  if (key) {
    const value = config[key];
    if (!value) return undefined;

    // Decrypt if it looks like an encrypted token
    if (typeof value === 'string' && value.includes(':')) {
      return decryptToken(value);
    }
    return value;
  }

  return config;
}

export async function setConfig(key: string, value: string): Promise<void> {
  const config = await loadConfig();

  // Encrypt if it's a token/secret field (specific fields only)
  const secretFields = ['github_token', 'bright_data_api_key', 'daytona_api_key', 'nosana_api_key'];
  if (secretFields.includes(key.toLowerCase())) {
    config[key] = encryptToken(value);
  } else {
    config[key] = value;
  }

  await saveConfig(config);
  console.log(chalk.green(`✓ Config saved: ${key}`));
}

export async function clearConfig(key: string): Promise<void> {
  const config = await loadConfig();
  delete config[key];
  await saveConfig(config);
  console.log(chalk.green(`✓ Config cleared: ${key}`));
}

export async function getApiKey(service: 'BRIGHT_DATA' | 'DAYTONA' | 'NOSANA'): Promise<string> {
  const envKey = process.env[`${service}_API_KEY`];
  if (envKey) {
    return envKey;
  }

  const configKey = await getConfig(service.toLowerCase() + '_api_key');
  if (configKey && typeof configKey === 'string') {
    return configKey;
  }

  throw new Error(
    `No ${service} API key found.\n` +
      `Set environment variable: export ${service}_API_KEY=<key>\n` +
      `Or run: codeprobe config set ${service.toLowerCase()}_api_key <key>`
  );
}

export async function getGitHubToken(): Promise<string> {
  const token = await getConfig('github_token');
  if (token && typeof token === 'string') {
    return token;
  }

  throw new Error(
    'No GitHub token found.\n' +
      'Set: codeprobe config set github_token <token>\n' +
      'Or: export GITHUB_TOKEN=<token>'
  );
}
