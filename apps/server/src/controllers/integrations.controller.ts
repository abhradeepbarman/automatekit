import apps from '@repo/integrations';
import { NextFunction, Request, Response } from 'express';
import { asyncHandler, ResponseHandler } from '../utils';

// Returns serializable integration metadata for the frontend (never `run`,
// `auth`, or the zod `schema`, which stay server-side).
export const getIntegrations = asyncHandler(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const integrations = apps.map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      icon: app.icon,
      hasAuth: !!app.auth,
      triggers: (app.triggers ?? []).map((trigger) => ({
        id: trigger.id,
        name: trigger.name,
        description: trigger.description,
        dataAvailable: trigger.dataAvailable ?? [],
      })),
      actions: (app.actions ?? []).map((action) => ({
        id: action.id,
        name: action.name,
        description: action.description,
        dataAvailable: action.dataAvailable ?? [],
      })),
    }));

    return res
      .status(200)
      .send(
        ResponseHandler(
          200,
          'Integrations fetched successfully',
          integrations,
        ),
      );
  },
);
