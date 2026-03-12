import crypto from 'crypto';
import 'dotenv/config';

type EncryptedData = {
  ciphertext: string;
  iv: string;
  tag: string;
};

export const encryptSymmetric = (text: string): EncryptedData => {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

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
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64'),
  );

  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
};
