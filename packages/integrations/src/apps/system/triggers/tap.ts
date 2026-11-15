import { type ITrigger, SystemEvent } from '@repo/common/types';

export const tap: ITrigger = {
  id: SystemEvent.TAP,
  name: 'Tap',
  description: 'Triggered when you tap Run on this node',

  run: () => ({ success: true, message: 'Tapped', statusCode: 200 }),
};
