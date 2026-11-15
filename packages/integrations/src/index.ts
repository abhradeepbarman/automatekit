import { type IApp } from '@repo/common/types';
import { discord } from './apps/discord';
import { gmail } from './apps/gmail';
import { system } from './apps/system';

const apps: IApp[] = [gmail, discord, system];

export const getEventSchema = (appId: string, eventId: string) => {
  const app = apps.find((a) => a.id === appId);
  return [...(app?.triggers ?? []), ...(app?.actions ?? [])].find(
    (event) => event.id === eventId,
  )?.schema;
};

export default apps;
