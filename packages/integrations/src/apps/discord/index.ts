import { AppType, type IApp } from '@repo/common/types';
import { sendMessage } from './actions/send-message';

export const discord: IApp = {
  id: AppType.DISCORD,
  name: 'Discord',
  description: 'send messages to your Discord channels',
  icon: '/icons/discord.png',
  actions: [sendMessage],
};
