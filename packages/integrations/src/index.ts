import { type IApp } from '@repo/common/types';
import { gmail } from './apps/gmail';
import { system } from './apps/system';

/**
 * All integration apps, including server-only `run`/`auth`. Server use only —
 * the browser uses the metadata API and `@repo/integrations/schemas` instead.
 */
const apps: IApp[] = [gmail, system];

export default apps;
export { isIntervalPassed } from './lib/interval';
