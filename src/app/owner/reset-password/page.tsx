
"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Home, Loader2, KeyRound, CheckCircle, AlertTriangle } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';

const formSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

function ResetPasswordComponent() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'verifying' | 'valid' | 'invalid' | 'success'>('verifying');
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const oobCode = searchParams.get('oobCode');

  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) {
        setStatus('invalid');
        setError("No reset code provided. Please request a new link.");
        return;
      }
      try {
        await verifyPasswordResetCode(auth, oobCode);
        setStatus('valid');
      } catch (error: any) {
        setStatus('invalid');
        setError("Invalid or expired password reset link. Please request a new one.");
        console.error("Verification failed:", error);
      }
    };
    verifyCode();
  }, [oobCode]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!oobCode) return;
    setLoading(true);
    setError(null);
    try {
      await confirmPasswordReset(auth, oobCode, values.password);
      setStatus('success');
      toast({
        title: "Password Reset Successful",
        description: "You can now log in with your new password.",
      });
    } catch (error: any) {
      setError("Failed to reset password. The link may have expired.");
      console.error("Password reset failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <CardHeader className="items-center text-center">
            <Loader2 className="h-16 w-16 animate-spin"/>
            <CardTitle>Verifying Link</CardTitle>
            <CardDescription>Please wait while we check your password reset link.</CardDescription>
          </CardHeader>
        );
      case 'invalid':
        return (
          <>
            <CardHeader className="items-center text-center">
              <AlertTriangle className="h-16 w-16 text-destructive"/>
              <CardTitle>Link Invalid</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/owner/forgot-password" className="w-full">
                <Button className="w-full" variant="destructive">Request New Link</Button>
              </Link>
            </CardContent>
          </>
        );
      case 'success':
        return (
          <>
            <CardHeader className="items-center text-center">
              <CheckCircle className="h-16 w-16 text-green-500"/>
              <CardTitle>Password Changed!</CardTitle>
              <CardDescription>Your password has been successfully updated.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/owner/login" className="w-full">
                <Button className="w-full">Proceed to Login</Button>
              </Link>
            </CardContent>
          </>
        );
      case 'valid':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">Set New Password</CardTitle>
              <CardDescription>Please enter your new password below.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl><Input type="password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <><KeyRound className="mr-2"/>Set New Password</>}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </>
        );
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full shadow-lg">
        {renderContent()}
      </Card>
      <Link href="/" className="absolute top-4 left-4">
        <Button variant="outline" size="icon"><Home className="h-4 w-4" /></Button>
      </Link>
    </div>
  );
}


export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <ResetPasswordComponent />
        </Suspense>
    )
}
