import { ConnectionCredentials, IApp, TokenResponse } from '@repo/common/types';
import { decrypt, encrypt, type EncryptedData } from '@repo/common/utils';
import db from '@repo/db';
import { connections } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

export const getAccessToken = (connection: { credentials: EncryptedData }) =>
  decrypt<ConnectionCredentials>(connection.credentials).accessToken ?? '';

export async function refreshAccessToken(
  connectionId: string,
  app: IApp,
): Promise<TokenResponse> {
  const connection = await db.query.connections.findFirst({
    where: eq(connections.id, connectionId),
  });

  if (!connection) {
    throw new Error('Connection not found');
  }

  if (!app.auth) {
    throw new Error('App has no auth');
  }

  const credentials = decrypt<ConnectionCredentials>(connection.credentials);
  if (!credentials.refreshToken) {
    throw new Error('Connection has no refresh token');
  }

  const tokens = await app.auth.refreshAccessToken(credentials.refreshToken);

  await db
    .update(connections)
    .set({
      credentials: encrypt({
        ...credentials,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? credentials.refreshToken,
      }),
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
    })
    .where(eq(connections.id, connectionId));

  return tokens;
}
