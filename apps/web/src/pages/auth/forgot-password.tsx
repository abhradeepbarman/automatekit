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
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { forgotPasswordSchema } from '@repo/common/validators';
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
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import AuthShell from '@/components/common/auth-shell';

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const { mutate: sendForgotPasswordEmail, isPending } = useMutation({
    mutationFn: (values: ForgotPasswordForm) =>
      authService.forgotPassword(values.email),
    onSuccess: (_, values) => setSubmittedEmail(values.email),
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Forgot password failed:', error);
      toast.error('Failed to send email', {
        description:
          error?.response?.data?.message ||
          'Something went wrong. Please try again.',
      });
    },
  });

  return (
    <AuthShell tagline="Automate smarter. Work faster.">
      {submittedEmail ? (
        /* Success State */
        <Card className="border-border/60 shadow-xl shadow-foreground/5">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-semibold">
              Check your email
            </CardTitle>
            <CardDescription className="text-center">
              We sent a password reset link to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="font-medium text-foreground">{submittedEmail}</p>
            <p className="text-sm text-muted-foreground">
              Click the link in the email to reset your password. The link will
              expire in 1 hour.
            </p>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setSubmittedEmail(null)}
            >
              Try a different email
            </Button>
          </CardContent>
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
      ) : (
        /* Email Form */
        <Card className="border-border/60 shadow-xl shadow-foreground/5">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Mail className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-semibold">
              Forgot password?
            </CardTitle>
            <CardDescription className="text-center">
              No worries! Enter your email and we'll send you a reset link.
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                sendForgotPasswordEmail(values),
              )}
              className="space-y-6"
            >
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          autoComplete="email"
                          {...field}
                        />
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
                  {isPending ? 'Sending...' : 'Send reset link'}
                </Button>
              </CardContent>
            </form>
          </Form>

          <CardFooter className="flex flex-col gap-4 border-t bg-muted/40 pt-6 text-sm text-muted-foreground">
            <p>
              <Link
                to="/login"
                className="text-primary underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to sign in
              </Link>
            </p>
            <p className="text-xs">
              © {new Date().getFullYear()} AutomateKit • All rights reserved
            </p>
          </CardFooter>
        </Card>
      )}
    </AuthShell>
  );
}
