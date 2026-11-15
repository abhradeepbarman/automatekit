import { logger } from '@repo/common/utils';
import { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import CustomErrorHandler from '../utils/custom-error-handler';
import { formatError } from '../utils/format-error';
import ResponseHandler from '../utils/response-handler';

const postgresErrors: Record<string, [number, string]> = {
  '22P02': [400, 'Invalid id'],
  '23503': [409, 'A related record does not exist'],
  '23505': [409, 'This record already exists'],
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const cause = (err.cause ?? err) as Error & { code?: string };
  let statusCode = 500;
  let message = 'Internal server error';
  let data: object | null = null;

  if (err instanceof CustomErrorHandler) {
    statusCode = err.status;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 422;
    message = 'Validation Error';
    data = formatError(err);
  } else if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (cause.code && postgresErrors[cause.code]) {
    [statusCode, message] = postgresErrors[cause.code]!;
  }

  const summary = `${req.method} ${req.originalUrl} -> ${statusCode}`;
  if (statusCode >= 500) {
    logger.error(`${summary}: ${cause.message}`, { stack: cause.stack });
  } else {
    logger.warn(
      `${summary}: ${message}${cause.code ? ` (${cause.code})` : ''}`,
    );
  }

  res.status(statusCode).json(ResponseHandler(statusCode, message, data));
};
