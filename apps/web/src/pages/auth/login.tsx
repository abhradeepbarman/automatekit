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
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { loginSchema } from '@repo/common/validators';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import authService from '@/services/auth.service';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { AxiosError } from 'axios';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { setUserCredentials } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const { mutateAsync: userLogin } = useMutation({
    mutationFn: (values: z.infer<typeof loginSchema>) =>
      authService.login(values.email, values.password),
    onSuccess: (data) => {
      setUserCredentials(data);
      toast.success('Login successful!', {
        description: 'Welcome back! Redirecting to dashboard...',
      });
      navigate('/dashboard');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Login failed:', error);
      toast.error('Login failed', {
        description:
          error?.response?.data?.message ||
          'Invalid email or password. Please try again.',
      });
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    await userLogin(values);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Branding */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            AutomateKit
          </h1>
          <p className="mt-3 text-muted-foreground">
            Automate smarter. Work faster.
          </p>
        </div>

        <Card className="border-border/50">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center font-semibold">
              Welcome back
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <CardContent className="space-y-4">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="abc@gmail.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <Link to="#" className="text-xs text-primary underline">
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="current-password"
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

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
                </Button>
              </CardContent>
            </form>
          </Form>

          <CardFooter className="flex flex-col gap-4 border-t bg-muted/40 pt-6 text-sm text-muted-foreground">
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-primary underline">
                Sign up
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
