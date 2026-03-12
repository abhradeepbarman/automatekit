import { and, eq, gt } from 'drizzle-orm';
import apps from '@repo/common/@apps';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';
import db from '@repo/db';
import { connections } from '@repo/db/schema';
import { encryptSymmetric } from '@repo/common/utils';

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
  async (req: Request, res: Response, next: NextFunction) => {
    const { provider } = req.params;
    if (!provider) {
      return res.send(renderErrorPage('Provider is required'));
    }

    const appDetails = apps.find((app) => app.id === provider);
    if (!appDetails) {
      return res.send(renderErrorPage('Invalid provider'));
    }

    const code = req.query.code as string;
    if (!code) {
      return res.send(renderErrorPage('Code is required'));
    }

    res.send(renderSucessPage(code, 'Success'));
  },
);

export const getConnections = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { provider } = req.params;

    if (!provider) {
      return next(CustomErrorHandler.badRequest('Provider is required'));
    }

    const userConnections = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.userId, req.user.id),
          eq(connections.app, provider as string),
          gt(connections.expiresAt, new Date()),
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
    const {
      ciphertext: accessCiphertext,
      iv: accessIv,
      tag: accessTag,
    } = encryptSymmetric(access_token);
    const {
      ciphertext: refreshCiphertext,
      iv: refreshIv,
      tag: refreshTag,
    } = encryptSymmetric(refresh_token ?? '');

    const [credentials] = await db
      .insert(connections)
      .values({
        app: appDetails.id,
        name: name ? `${name}(${email})` : email,

        accessTokenEncrypt: accessCiphertext,
        accessTokenIV: accessIv,
        accessTokenTag: accessTag,

        refreshTokenEncrypt: refreshCiphertext,
        refreshTokenIV: refreshIv,
        refreshTokenTag: refreshTag,

        expiresAt: new Date(Date.now() + expires_in * 1000),
        userId: req.user.id,
      })
      .returning();

    if (!credentials) {
      return next(
        CustomErrorHandler.badRequest('Failed to create credentials'),
      );
    }

    return res.status(200).send(
      ResponseHandler(200, 'Credentials fetched successfully', {
        id: credentials.id,
        app: credentials.app,
        name: credentials.name,
      }),
    );
  },
);

const renderErrorPage = (message: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Error</title>
      </head>
      <body>
        <h1>${message}</h1>
      </body>
    </html>
  `;
};

const renderSucessPage = (code: string, message: string) => {
  return `<!DOCTYPE html>
    <html>
      <head>
        <title>Success</title>
      </head>
      <body>
        <h1>${message}</h1>
        <script>
          window.opener.postMessage({
            type: "OAUTH_SUCCESS",
            code: "${code}",
          }, "*");
          window.close();
        </script>
      </body>
    </html>`;
};
