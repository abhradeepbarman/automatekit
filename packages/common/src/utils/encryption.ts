import crypto from 'crypto';
import 'dotenv/config';

export type EncryptedData = {
  ciphertext: string;
  iv: string;
  tag: string;
};

const KEY_BYTES = 32; // AES-256

let cachedKey: Buffer | null = null;

const getKey = (): Buffer => {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not set');
  }

  const key = Buffer.from(raw, 'hex');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex characters), got ${key.length}`,
    );
  }

  cachedKey = key;
  return key;
};

export const encryptSymmetric = (text: string): EncryptedData => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);

  let ciphertext = cipher.update(text, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
};

export const decryptSymmetric = (
  ciphertext: string,
  iv: string,
  tag: string,
): string => {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(iv, 'base64'),
  );

  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
};

export const encryptJson = (value: unknown): EncryptedData =>
  encryptSymmetric(JSON.stringify(value));

export const decryptJson = <T>({ ciphertext, iv, tag }: EncryptedData): T =>
  JSON.parse(decryptSymmetric(ciphertext, iv, tag)) as T;
