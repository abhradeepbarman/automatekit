import type {
  ConnectionCredentials,
  IApp,
  ReturnResponse,
} from '@repo/common/types';
import { decrypt, encrypt, logger } from '@repo/common/utils';
import db from '@repo/db';
import { connections } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

type Connection = typeof connections.$inferSelect;

const getCredentials = (connection: Connection) =>
  decrypt<ConnectionCredentials>(connection.credentials);

export const refreshAccessToken = async (
  connection: Connection,
  app: IApp,
): Promise<string> => {
  if (!app.auth) throw new Error(`${app.name} has no auth`);

  const credentials = getCredentials(connection);
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
    .where(eq(connections.id, connection.id));

  return tokens.access_token;
};

export const runWithAuth = async (
  app: IApp,
  connection: Connection | null,
  run: (accessToken: string) => Promise<ReturnResponse> | ReturnResponse,
): Promise<ReturnResponse> => {
  if (!app.auth || !connection) return run('');

  const result = await run(getCredentials(connection).accessToken ?? '');
  if (result.success || result.statusCode !== 401) return result;

  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(connection, app);
  } catch (error) {
    logger.error(
      `Token refresh failed for connection ${connection.id}: ${error}`,
    );
    return {
      success: false,
      statusCode: 401,
      message: 'Failed to refresh token',
    };
  }

  return run(accessToken);
};
