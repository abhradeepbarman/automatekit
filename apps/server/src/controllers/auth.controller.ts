import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@repo/common/validators';
import db from '@repo/db';
import { passwordTokens, users } from '@repo/db/schema';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import { sendEmail } from '../services/send-email';
import { forgotPasswordEmailTemplate } from '../template';
import { asyncHandler, CustomErrorHandler, ResponseHandler } from '../utils';

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, config.ACCESS_SECRET, {
    expiresIn: '1h',
  });
  const refreshToken = jwt.sign({ id: userId }, config.REFRESH_SECRET, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
};

export const setCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 1000,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
  });
};

export const userRegister = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const body = registerSchema.parse(req.body);
    const { name, email, password } = body;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return next(CustomErrorHandler.alreadyExist('User already exists'));
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
      })
      .returning();

    if (!newUser) return next(CustomErrorHandler.serverError());

    const { accessToken, refreshToken } = generateTokens(newUser.id);
    setCookies(res, accessToken, refreshToken);

    await db
      .update(users)
      .set({ refreshToken: refreshToken })
      .where(eq(users.id, newUser.id));

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
    const body = loginSchema.parse(req.body);
    const { email, password } = body;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!existingUser) {
      return next(CustomErrorHandler.notFound('User not found'));
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password,
    );

    if (!isPasswordValid) {
      return next(CustomErrorHandler.wrongCredentials());
    }

    const { accessToken, refreshToken } = generateTokens(existingUser.id);
    setCookies(res, accessToken, refreshToken);

    const [updateUser] = await db
      .update(users)
      .set({
        refreshToken: refreshToken,
      })
      .where(eq(users.id, existingUser.id))
      .returning();

    if (!updateUser) return next(CustomErrorHandler.serverError());

    return res.status(200).send(
      ResponseHandler(200, 'User logged in successfully', {
        id: updateUser.id,
        name: updateUser.name,
        email: updateUser.email,
        access_token: accessToken,
      }),
    );
  },
);

export const userLogout = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.user.id;

    const [data] = await db
      .update(users)
      .set({ refreshToken: null })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
      });

    return res
      .status(200)
      .clearCookie('access_token')
      .clearCookie('refresh_token')
      .send(ResponseHandler(200, 'User logged out successfully', data));
  },
);

export const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies['refresh_token'] || req.body?.refresh_token;

    if (!token) {
      return next(CustomErrorHandler.serverError());
    }

    const decoded = jwt.verify(token, config.REFRESH_SECRET) as JwtPayload;

    if (!decoded || !decoded?.id) {
      return next(CustomErrorHandler.serverError());
    }

    const userDetails = await db.query.users.findFirst({
      where: and(eq(users.id, decoded.id), eq(users.refreshToken, token)),
    });

    if (!userDetails) {
      return next(CustomErrorHandler.serverError());
    }

    const { accessToken, refreshToken } = generateTokens(userDetails.id);
    setCookies(res, accessToken, refreshToken);

    await db
      .update(users)
      .set({ refreshToken: refreshToken })
      .where(eq(users.id, userDetails.id));

    return res.status(200).send(
      ResponseHandler(200, 'Refresh token generated', {
        id: userDetails.id,
        access_token: accessToken,
      }),
    );
  },
);

export const sendForgotPasswordEmail = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    if (!email) {
      return next(CustomErrorHandler.badRequest('Email is required'));
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!existingUser) {
      return next(CustomErrorHandler.notFound('User not found'));
    }

    const token = jwt.sign({ id: existingUser.id }, config.ACCESS_SECRET, {
      expiresIn: '24h',
    });
    const link = `${config.APP_URL}/reset-password/${token}`;

    await db.insert(passwordTokens).values({
      userId: existingUser.id,
      token: token,
    });

    //send email
    const html = forgotPasswordEmailTemplate(existingUser.name, link);
    await sendEmail({
      to: email as string,
      subject: 'Reset Your Password',
      body: html,
    });

    return res
      .status(200)
      .send(ResponseHandler(200, 'Email sent successfully', { link }));
  },
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { token } = req.params;
    const body = resetPasswordSchema.parse(req.body);

    const existingToken = await db.query.passwordTokens.findFirst({
      where: eq(passwordTokens.token, token as string),
    });
    if (!existingToken) {
      return next(CustomErrorHandler.badRequest('Token is invalid'));
    }

    const payload = jwt.verify(
      token as string,
      config.ACCESS_SECRET,
    ) as JwtPayload;

    if (payload.id != existingToken.userId) {
      return next(CustomErrorHandler.badRequest('Token is invalid'));
    }

    if (Date.now() > existingToken.createdAt.getTime() + 24 * 60 * 60 * 1000) {
      return next(CustomErrorHandler.badRequest('Token is expired'));
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, existingToken.userId));

    return res
      .status(200)
      .send(ResponseHandler(200, 'Password reset successfully'));
  },
);
