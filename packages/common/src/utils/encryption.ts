import crypto from 'crypto';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
}

const ALGORITHM = 'aes-256-gcm';

const getKey = () => {
  const key = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters');
  }
  return key;
};

export const encrypt = (value: unknown): EncryptedData => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
};

export const decrypt = <T>({ ciphertext, iv, tag }: EncryptedData): T => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString('utf8')) as T;
};
