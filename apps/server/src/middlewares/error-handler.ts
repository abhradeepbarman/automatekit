import { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import { formatError } from '../utils/format-error';
import CustomErrorHandler from '../utils/custom-error-handler';
import ResponseHandler from '../utils/response-handler';

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = 500;
  let message: string = 'Internal server error';
  let data: object | null = null;

  console.error(err);

  if (err instanceof ZodError) {
    statusCode = 422;
    message = 'Validation Error';
    data = formatError(err);
  }

  if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Unauthorized';
  }

  if (err instanceof CustomErrorHandler) {
    statusCode = err.status;
    message = err.message;
  }

  res.status(statusCode).json(ResponseHandler(statusCode, message, data));
};

export default errorHandler;
