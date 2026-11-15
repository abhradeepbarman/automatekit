import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { KeyRound } from 'lucide-react';
import AuthShell from '@/components/common/auth-shell';
import PasswordInput from '@/components/common/password-input';

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const { mutate: doResetPassword, isPending } = useMutation({
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

  return (
    <AuthShell tagline="Automate smarter. Work faster.">
      <Card className="border-border/60 shadow-xl shadow-foreground/5">
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
          <form
            onSubmit={form.handleSubmit((values) => doResetPassword(values))}
            className="space-y-6"
          >
            <CardContent className="space-y-4">
              {/* New Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <PasswordInput autoComplete="new-password" {...field} />
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
                      <PasswordInput autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isPending}
              >
                {isPending ? 'Resetting...' : 'Reset password'}
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
    </AuthShell>
  );
}
