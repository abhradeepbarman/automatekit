import { type ITrigger, SystemEvent } from '@repo/common/types';

export const tap: ITrigger = {
  id: SystemEvent.TAP,
  name: 'Tap',
  description: 'Triggered when you press Run on this node',
  icon: '/icons/tap.svg',

  run: () => ({ success: true, message: 'Tapped', statusCode: 200 }),
};
