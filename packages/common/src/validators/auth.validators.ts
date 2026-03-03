import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(255, 'Name must be less than 255 characters'),

    email: z.string().min(1, 'Email is required').email('Invalid email'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must be less than 128 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Password must contain uppercase, lowercase, number, and special character',
      ),

    confirmPassword: z.string().min(1, 'Confirm Password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(5, 'Password must be at least 8 characters long')
      .max(128, 'Password must be less than 128 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
