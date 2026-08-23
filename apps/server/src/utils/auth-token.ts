import crypto from 'crypto';
import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { envConfig } from '../config/env';

export const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, envConfig.ACCESS_SECRET, {
    expiresIn: '1h',
  });
  const refreshToken = jwt.sign({ id: userId }, envConfig.REFRESH_SECRET, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
};

export const setCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  const secure = envConfig.NODE_ENV === 'production';
  const sameSite: 'none' | 'lax' = secure ? 'none' : 'lax';

  res.cookie('access_token', accessToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 1000,
    secure,
    sameSite,
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure,
    sameSite,
  });
};
