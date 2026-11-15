import type { IAction, ITrigger } from '@repo/common/types';
import apps from '@repo/integrations';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler, ResponseHandler } from '../utils';

const toEvent = ({
  id,
  name,
  description,
  icon,
  dataAvailable,
}: ITrigger | IAction) => ({
  id,
  name,
  description,
  icon,
  dataAvailable: dataAvailable ?? [],
});

export const getIntegrations = asyncHandler(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const integrations = apps.map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      icon: app.icon,
      hasAuth: !!app.auth,
      triggers: (app.triggers ?? []).map(toEvent),
      actions: (app.actions ?? []).map(toEvent),
    }));

    return res
      .status(200)
      .send(
        ResponseHandler(200, 'Integrations fetched successfully', integrations),
      );
  },
);
