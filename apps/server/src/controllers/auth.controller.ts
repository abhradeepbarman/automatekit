import { AuthProvider } from '@repo/common/types';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@repo/common/validators';
import db from '@repo/db';
import { passwordTokens, users } from '@repo/db/schema';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import {
  BCRYPT_ROUNDS,
  GOOGLE_AUTH_URL,
  OAUTH_STATE_COOKIE,
} from '../constants';
import { getGoogleProfile, getGoogleTokens, sendEmail } from '../services';
import { forgotPasswordEmailTemplate } from '../templates';
import {
  asyncHandler,
  CustomErrorHandler,
  generateTokens,
  hashToken,
  ResponseHandler,
  setCookies,
  validateRequest,
} from '../utils';

const issueSession = async (res: Response, userId: string) => {
  const { accessToken, refreshToken } = generateTokens(userId);
  setCookies(res, accessToken, refreshToken);

  await db
    .update(users)
    .set({ refreshToken: hashToken(refreshToken) })
    .where(eq(users.id, userId));

  return accessToken;
};

export const userRegister = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, password, email: rawEmail } = registerSchema.parse(req.body);
    const email = validateRequest.normalizeEmail(rawEmail);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return next(CustomErrorHandler.alreadyExist('User already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        authProvider: AuthProvider.LOCAL,
      })
      .returning();

    if (!newUser) return next(CustomErrorHandler.serverError());

    const accessToken = await issueSession(res, newUser.id);

    return res.status(201).send(
      ResponseHandler(201, 'User registered successfully', {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        access_token: accessToken,
      }),
    );
  },
);

export const userLogin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { password, email: rawEmail } = loginSchema.parse(req.body);
    const email = validateRequest.normalizeEmail(rawEmail);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (
      !existingUser ||
      existingUser.authProvider !== AuthProvider.LOCAL ||
      !existingUser.password
    ) {
      return next(CustomErrorHandler.wrongCredentials());
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password,
    );
    if (!isPasswordValid) {
      return next(CustomErrorHandler.wrongCredentials());
    }

    const accessToken = await issueSession(res, existingUser.id);

    return res.status(200).send(
      ResponseHandler(200, 'User logged in successfully', {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        access_token: accessToken,
      }),
    );
  },
);

export const userLogout = asyncHandler(async (req: Request, res: Response) => {
  const [data] = await db
    .update(users)
    .set({ refreshToken: null })
    .where(eq(users.id, req.user.id))
    .returning({ id: users.id, name: users.name });

  return res
    .status(200)
    .clearCookie('access_token')
    .clearCookie('refresh_token')
    .send(ResponseHandler(200, 'User logged out successfully', data));
});

export const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies['refresh_token'] || req.body?.refresh_token;
    if (!token) {
      return next(CustomErrorHandler.unAuthorized());
    }

    const decoded = jwt.verify(token, config.REFRESH_SECRET) as JwtPayload;
    if (!decoded?.id) {
      return next(CustomErrorHandler.unAuthorized());
    }

    const userDetails = await db.query.users.findFirst({
      where: eq(users.id, decoded.id),
    });

    if (
      !userDetails ||
      !userDetails.refreshToken ||
      userDetails.refreshToken !== hashToken(token)
    ) {
      return next(CustomErrorHandler.unAuthorized());
    }

    const accessToken = await issueSession(res, userDetails.id);

    return res.status(200).send(
      ResponseHandler(200, 'Refresh token generated', {
        id: userDetails.id,
        name: userDetails.name,
        email: userDetails.email,
        access_token: accessToken,
      }),
    );
  },
);

export const sendForgotPasswordEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { email: rawEmail } = forgotPasswordSchema.parse(req.body);
    const email = validateRequest.normalizeEmail(rawEmail);

    const genericResponse = () =>
      res
        .status(200)
        .send(
          ResponseHandler(
            200,
            'If an account exists for that email, a reset link has been sent',
          ),
        );

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!existingUser || existingUser.authProvider !== AuthProvider.LOCAL) {
      return genericResponse();
    }

    const rawToken = crypto.randomBytes(32).toString('hex');

    await db.insert(passwordTokens).values({
      userId: existingUser.id,
      token: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const link = `${config.APP_URL}/reset-password/${rawToken}`;
    const html = forgotPasswordEmailTemplate(existingUser.name, link);
    await sendEmail({ to: email, subject: 'Reset Your Password', body: html });

    return genericResponse();
  },
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const { password } = resetPasswordSchema.parse(req.body);

    if (!token) {
      return next(CustomErrorHandler.badRequest('Token is invalid'));
    }

    const existingToken = await db.query.passwordTokens.findFirst({
      where: eq(passwordTokens.token, hashToken(token as string)),
    });

    if (!existingToken) {
      return next(CustomErrorHandler.badRequest('Token is invalid'));
    }
    if (existingToken.usedAt) {
      return next(CustomErrorHandler.badRequest('Token has already been used'));
    }
    if (Date.now() > existingToken.expiresAt.getTime()) {
      return next(CustomErrorHandler.badRequest('Token is expired'));
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await db
      .update(users)
      .set({ password: hashedPassword, refreshToken: null })
      .where(eq(users.id, existingToken.userId));

    await db
      .update(passwordTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordTokens.id, existingToken.id));

    return res
      .status(200)
      .send(ResponseHandler(200, 'Password reset successfully'));
  },
);

// Google OAuth2 login and callback handlers

export const googleLogin = asyncHandler(
  async (_req: Request, res: Response, next: NextFunction) => {
    if (!config.GOOGLE_AUTH_CLIENT_ID || !config.GOOGLE_AUTH_CLIENT_SECRET) {
      return next(
        CustomErrorHandler.serverError('Google login is not configured'),
      );
    }

    const state = jwt.sign(
      { n: crypto.randomBytes(16).toString('hex') },
      config.ACCESS_SECRET,
      { expiresIn: '10m' },
    );

    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
      secure: config.NODE_ENV === 'production',
      sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', config.GOOGLE_AUTH_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', config.GOOGLE_AUTH_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'online');
    authUrl.searchParams.set('prompt', 'select_account');

    return res.redirect(authUrl.toString());
  },
);

export const googleCallback = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const code =
      typeof req.query.code === 'string' ? req.query.code : undefined;
    const state =
      typeof req.query.state === 'string' ? req.query.state : undefined;
    const cookieState = req.cookies[OAUTH_STATE_COOKIE];

    res.clearCookie(OAUTH_STATE_COOKIE);

    if (!code || !state || !cookieState || state !== cookieState) {
      return next(CustomErrorHandler.unAuthorized('Invalid OAuth state'));
    }
    jwt.verify(state, config.ACCESS_SECRET);

    const googleAccessToken = await getGoogleTokens(code);
    const profile = await getGoogleProfile(googleAccessToken);

    if (!profile.email || !profile.verified_email) {
      return next(
        CustomErrorHandler.unAuthorized('Google account email is not verified'),
      );
    }

    const email = validateRequest.normalizeEmail(profile.email);

    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (user && user.authProvider !== AuthProvider.GOOGLE) {
      return next(
        CustomErrorHandler.alreadyExist(
          'An account with this email already exists. Please sign in with your password.',
        ),
      );
    }

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          name: profile.name || email.split('@')[0] || 'User',
          email,
          authProvider: AuthProvider.GOOGLE,
        })
        .returning();
    }
    if (!user) return next(CustomErrorHandler.serverError());

    await issueSession(res, user.id);

    return res.redirect(`${config.APP_URL}/auth/google-callback`);
  },
);
