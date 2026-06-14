import { Router } from 'express';
import {
  googleCallback,
  googleLogin,
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

// Google OAuth login (authorization-code flow)
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

export default router;
