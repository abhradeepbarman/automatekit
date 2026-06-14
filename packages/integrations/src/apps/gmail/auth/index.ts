import axios from 'axios';
import { type TokenResponse } from '@repo/common/types';

const getAuthUrl = (): string => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const response_type = 'code';
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId!);
  authUrl.searchParams.append('redirect_uri', redirectUri!);
  authUrl.searchParams.append('response_type', response_type);
  authUrl.searchParams.append('scope', scopes.join(' '));

  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');

  return authUrl.toString();
};

const getToken = async (code: string): Promise<TokenResponse> => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const grant_type = 'authorization_code';

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri!,
      grant_type,
      code,
    });

    const { data } = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    console.error('Error getting token:', error);
    throw error;
  }
};

const getUserInfo = async (
  accessToken: string,
): Promise<{ id: string; name: string; email: string }> => {
  try {
    const { data } = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return {
      id: data.id,
      name: data.name,
      email: data.email,
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
};

const refreshAccessToken = async (
  refreshToken: string,
): Promise<TokenResponse> => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const grant_type = 'refresh_token';

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      grant_type,
      refresh_token: refreshToken,
    });

    const { data } = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
};

export default {
  getAuthUrl,
  getToken,
  getUserInfo,
  refreshAccessToken,
};
