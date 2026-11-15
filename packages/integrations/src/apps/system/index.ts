import { AppType, type IApp } from '@repo/common/types';
import { tap } from './triggers/tap';
import { timer } from './triggers/timer';
import { webhook } from './triggers/webhook';

export const system: IApp = {
  id: AppType.SYSTEM,
  name: 'Others',
  description: 'system events',
  icon: '/system.png',
  triggers: [tap, timer, webhook],
};
