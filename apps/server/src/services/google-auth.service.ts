import config from '../config';
import { GOOGLE_TOKEN_URL, GOOGLE_USERINFO_URL } from '../constants';
import CustomErrorHandler from '../utils/custom-error-handler';

export type GoogleProfile = {
  email?: string;
  name?: string;
  verified_email?: boolean;
};

export const getGoogleTokens = async (code: string): Promise<string> => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.GOOGLE_AUTH_CLIENT_ID,
      client_secret: config.GOOGLE_AUTH_CLIENT_SECRET,
      redirect_uri: config.GOOGLE_AUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
      code,
    }).toString(),
  });

  const data = (await response.json().catch(() => null)) as {
    access_token?: string;
  } | null;

  if (!response.ok || !data?.access_token) {
    throw CustomErrorHandler.unAuthorized('Google authentication failed');
  }

  return data.access_token;
};

export const getGoogleProfile = async (
  accessToken: string,
): Promise<GoogleProfile> => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw CustomErrorHandler.unAuthorized('Google authentication failed');
  }

  return (await response.json()) as GoogleProfile;
};
