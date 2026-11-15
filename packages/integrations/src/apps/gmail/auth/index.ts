import axios from 'axios';
import { type TokenResponse } from '@repo/common/types';

const config = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI ?? '',
});

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const requestToken = async (
  params: Record<string, string>,
): Promise<TokenResponse> => {
  const { clientId, clientSecret } = config();
  const { data } = await axios.post(
    'https://oauth2.googleapis.com/token',
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...params,
    }),
  );

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
};

const getAuthUrl = () => {
  const { clientId, redirectUri } = config();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  }).toString();
  return url.toString();
};

const getToken = (code: string) =>
  requestToken({
    grant_type: 'authorization_code',
    redirect_uri: config().redirectUri,
    code,
  });

const refreshAccessToken = async (refreshToken: string) => {
  const tokens = await requestToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  return { ...tokens, refresh_token: tokens.refresh_token || refreshToken };
};

const getUserInfo = async (accessToken: string) => {
  const { data } = await axios.get(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return { id: data.id, name: data.name, email: data.email };
};

export default { getAuthUrl, getToken, getUserInfo, refreshAccessToken };
