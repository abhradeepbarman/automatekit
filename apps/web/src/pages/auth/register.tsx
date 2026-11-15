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
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@repo/common/validators';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
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
import { useAuth } from '@/context/auth-context';
import GoogleLoginButton from '@/components/common/google-login-button';
import AuthShell from '@/components/common/auth-shell';
import PasswordInput from '@/components/common/password-input';
import type { AxiosError } from 'axios';

export default function Register() {
  const { setUserCredentials } = useAuth();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const { mutate: userRegister, isPending } = useMutation({
    mutationFn: (values: z.infer<typeof registerSchema>) =>
      authService.register(
        values.name,
        values.email,
        values.password,
        values.confirmPassword,
      ),
    onSuccess: (data) => {
      setUserCredentials(data);
      toast.success('Account created', {
        description: 'Redirecting to dashboard...',
      });
      navigate('/dashboard');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Registration failed:', error);
      toast.error("Couldn't create account", {
        description:
          error?.response?.data?.message ||
          'Unable to create account. Please try again.',
      });
    },
  });

  return (
    <AuthShell tagline="Start automating smarter today">
      <Card className="border-border/60 shadow-xl shadow-foreground/5">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl text-center font-semibold">
            Create an account
          </CardTitle>
          <CardDescription className="text-center">
            Enter your details to get started
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => userRegister(values))}
            className="space-y-6"
          >
            <CardContent className="space-y-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        autoComplete="name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
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

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
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
                    <FormLabel>Confirm Password</FormLabel>
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
                {isPending ? 'Creating account...' : 'Create account'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <GoogleLoginButton label="Sign up with Google" />
            </CardContent>
          </form>
        </Form>

        <CardFooter className="flex flex-col gap-4 border-t bg-muted/40 pt-6 text-sm text-muted-foreground">
          <p>
            Already have an account?{' '}
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
