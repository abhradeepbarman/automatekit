import { AppType, type IApp } from '@repo/common/types';
import { httpRequest } from './actions/http-request';
import { tap } from './triggers/tap';
import { timer } from './triggers/timer';
import { webhook } from './triggers/webhook';

export const system: IApp = {
  id: AppType.SYSTEM,
  name: 'Built-in',
  description: 'Timers, webhooks, manual runs and HTTP requests',
  icon: '/icons/built-in.png',
  triggers: [tap, timer, webhook],
  actions: [httpRequest],
};
