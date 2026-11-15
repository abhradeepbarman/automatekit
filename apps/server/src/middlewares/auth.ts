import db from '@repo/db';
import { users } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { envConfig } from '../config/env';
import CustomErrorHandler from '../utils/custom-error-handler';

export const auth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token =
      req.headers.authorization?.split(' ')[1] || req.cookies['access_token'];
    if (!token) return next(CustomErrorHandler.unAuthorized());

    const { id } = jwt.verify(token, envConfig.ACCESS_SECRET) as JwtPayload;
    const user =
      id &&
      (await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { id: true },
      }));
    if (!user) return next(CustomErrorHandler.unAuthorized());

    req.user = { id: user.id };
    next();
  } catch (error) {
    next(error);
  }
};
