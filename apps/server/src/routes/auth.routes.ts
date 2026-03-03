import { Router } from 'express';
import {
  refreshAccessToken,
  resetPassword,
  sendForgotPasswordEmail,
  userLogin,
  userLogout,
  userRegister,
} from '../controllers/auth.controller';
import { auth } from '../middlewares';

const router: Router = Router();

router.post('/register', userRegister);
router.post('/login', userLogin);
router.post('/logout', auth, userLogout);
router.post('/refresh', refreshAccessToken);
router.post('/forgot-password', sendForgotPasswordEmail);
router.post('/reset-password/:token', resetPassword);

export default router;
