import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { resetPasswordSchema } from '@repo/common/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useMutation } from '@tanstack/react-query';
import authService from '@/services/auth.service';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const { mutateAsync: doResetPassword } = useMutation({
    mutationFn: (values: ResetPasswordForm) =>
      authService.resetPassword(
        token!,
        values.password,
        values.confirmPassword,
      ),
    onSuccess: () => {
      toast.success('Password reset successfully!', {
        description: 'You can now sign in with your new password.',
      });
      navigate('/login');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Reset password failed:', error);
      toast.error('Failed to reset password', {
        description:
          error?.response?.data?.message ||
          'The link may be expired or invalid. Please request a new one.',
      });
    },
  });

  async function onSubmit(values: ResetPasswordForm) {
    await doResetPassword(values);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="border-border/50 text-center">
            <CardContent className="pt-10 pb-8 space-y-3">
              <p className="text-lg font-semibold text-destructive">
                Invalid Reset Link
              </p>
              <p className="text-sm text-muted-foreground">
                This password reset link is missing a token and is invalid.
              </p>
              <Button asChild className="mt-4">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Branding */}
        <div className="text-center">
          <Link
            to={'/'}
            className="text-4xl font-bold tracking-tight text-primary"
          >
            AutomateKit
          </Link>
          <p className="mt-3 text-muted-foreground">
            Automate smarter. Work faster.
          </p>
        </div>

        <Card className="border-border/50">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <KeyRound className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-semibold">
              Set new password
            </CardTitle>
            <CardDescription className="text-center">
              Your new password must be different from previous ones.
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <CardContent className="space-y-4">
                {/* New Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm Password */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting
                    ? 'Resetting...'
                    : 'Reset password'}
                </Button>
              </CardContent>
            </form>
          </Form>

          <CardFooter className="flex flex-col gap-4 border-t bg-muted/40 pt-6 text-sm text-muted-foreground">
            <p>
              Remembered your password?{' '}
              <Link to="/login" className="text-primary underline">
                Sign in
              </Link>
            </p>
            <p className="text-xs">
              © {new Date().getFullYear()} AutomateKit • All rights reserved
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
