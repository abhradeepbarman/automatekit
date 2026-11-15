import { and, eq } from 'drizzle-orm';
import apps from '@repo/integrations';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';
import db from '@repo/db';
import { connections } from '@repo/db/schema';
import type { ConnectionCredentials } from '@repo/common/types';
import { encryptJson } from '@repo/common/utils';
import { envConfig } from '../config/env';

export const getAuthUrl = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { provider } = req.params;
    if (!provider) {
      return next(CustomErrorHandler.badRequest('Provider is required'));
    }

    const appDetails = apps.find((app) => app.id === provider);
    if (!appDetails) {
      return next(CustomErrorHandler.badRequest('Invalid provider'));
    }

    const authUrl = appDetails?.auth?.getAuthUrl();
    if (!authUrl) {
      return next(CustomErrorHandler.badRequest('Invalid provider'));
    }

    return res
      .status(200)
      .send(ResponseHandler(200, 'Auth URL fetched successfully', { authUrl }));
  },
);

export const handleOAuthCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const html = (status: number, body: string) =>
      res.status(status).type('html').send(body);

    const { provider } = req.params;
    if (!provider) {
      return html(400, renderErrorPage('Provider is required'));
    }

    const appDetails = apps.find((app) => app.id === provider);
    if (!appDetails) {
      return html(400, renderErrorPage('Invalid provider'));
    }

    if (typeof req.query.error === 'string') {
      return html(400, renderErrorPage('Authorization was denied'));
    }

    const code =
      typeof req.query.code === 'string' ? req.query.code : undefined;
    if (!code) {
      return html(400, renderErrorPage('Code is required'));
    }

    return html(200, renderSuccessPage(code, 'Connected successfully'));
  },
);

export const getConnections = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { provider } = req.params;

    if (!provider) {
      return next(CustomErrorHandler.badRequest('Provider is required'));
    }

    const userConnections = await db
      .select({
        id: connections.id,
        name: connections.name,
        integration: connections.integration,
        createdAt: connections.createdAt,
      })
      .from(connections)
      .where(
        and(
          eq(connections.userId, req.user.id),
          eq(connections.integration, provider as string),
        ),
      );

    return res
      .status(200)
      .send(
        ResponseHandler(
          200,
          'Connections fetched successfully',
          userConnections,
        ),
      );
  },
);

export const getTokenUrl = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { code } = req.body;
    if (!code) {
      return next(CustomErrorHandler.badRequest('Code is required'));
    }

    const { provider } = req.params;
    if (!provider) {
      return next(CustomErrorHandler.badRequest('Provider is required'));
    }

    const appDetails = apps.find((app) => app.id === provider);
    if (!appDetails) {
      return next(CustomErrorHandler.badRequest('Invalid provider'));
    }

    if (!appDetails.auth) {
      return next(CustomErrorHandler.badRequest('Invalid provider'));
    }

    const { access_token, refresh_token, expires_in } =
      await appDetails.auth.getToken(code);

    if (!access_token) {
      return next(CustomErrorHandler.badRequest());
    }

    const { email, name } = await appDetails.auth.getUserInfo(access_token);
    const credentials: ConnectionCredentials = {
      accessToken: access_token,
      refreshToken: refresh_token,
    };

    const [connection] = await db
      .insert(connections)
      .values({
        userId: req.user.id,
        integration: appDetails.id,
        name: name ? `${name}(${email})` : email,
        credentials: encryptJson(credentials),
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : null,
      })
      .returning();

    if (!connection) {
      return next(
        CustomErrorHandler.badRequest('Failed to create credentials'),
      );
    }

    return res.status(200).send(
      ResponseHandler(200, 'Credentials fetched successfully', {
        id: connection.id,
        integration: connection.integration,
        name: connection.name,
      }),
    );
  },
);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderErrorPage = (message: string) => {
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Connection failed</title>
      </head>
      <body>
        <h1>${escapeHtml(message)}</h1>
        <p>You can close this window and try again.</p>
      </body>
    </html>`;
};

const renderSuccessPage = (code: string, message: string) => {
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Connected</title>
      </head>
      <body>
        <h1>${escapeHtml(message)}</h1>
        <p>You can close this window.</p>
        <div id="oauth-payload"
             data-code="${escapeHtml(code)}"
             data-origin="${escapeHtml(envConfig.APP_URL)}"></div>
        <script>
          (function () {
            var el = document.getElementById('oauth-payload');
            var code = el.getAttribute('data-code');
            var targetOrigin = el.getAttribute('data-origin');
            if (window.opener) {
              window.opener.postMessage(
                { type: 'OAUTH_SUCCESS', code: code },
                targetOrigin
              );
            }
            window.close();
          })();
        </script>
      </body>
    </html>`;
};
