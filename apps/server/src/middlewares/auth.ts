import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import CustomErrorHandler from '../utils/custom-error-handler';
import { envConfig } from '../config/env';

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token =
      req.headers.authorization?.split(' ')[1] || req.cookies['access_token'];

    if (!token) {
      return next(CustomErrorHandler.unAuthorized());
    }

    const decoded = jwt.verify(token, envConfig.ACCESS_SECRET) as JwtPayload;

    if (!decoded || !decoded.id) {
      return next(CustomErrorHandler.unAuthorized());
    }

    req.user = {
      id: decoded.id,
    };

    next();
  } catch (error) {
    next(error);
  }
};
