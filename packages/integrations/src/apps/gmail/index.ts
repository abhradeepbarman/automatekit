import { AppType, type IApp } from '@repo/common/types';
import { sendEmail } from './actions/send-email';
import auth from './auth';

export const gmail: IApp = {
  id: AppType.GMAIL,
  name: 'Gmail',
  description: 'connect to your Gmail account',
  icon: '/gmail.png',
  auth,
  actions: [sendEmail],
};
