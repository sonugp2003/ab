
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Home, Loader2, Mail, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" }
    });

    const handleSendResetEmail = async ({ email }: z.infer<typeof emailSchema>) => {
        setLoading(true);

        try {
            // It's a best practice to not reveal if an email is registered or not.
            // We will always show a success message.
            const actionCodeSettings = {
                url: `${window.location.origin}/owner/reset-password`,
                handleCodeInApp: true,
            };

            await sendPasswordResetEmail(auth, email, actionCodeSettings);

            setEmailSent(true);

        } catch (error: any) {
            console.error("Failed to send password reset email:", error);
            // Even if it fails, we show success to prevent user enumeration.
            setEmailSent(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="mx-auto max-w-sm w-full shadow-lg">
                {!emailSent ? (
                    <>
                        <CardHeader>
                            <CardTitle className="text-2xl">Reset Password</CardTitle>
                            <CardDescription>
                                Enter your email address and we will send you a link to reset your password.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSendResetEmail)} className="grid gap-4">
                                <FormField
                                  control={form.control}
                                  name="email"
                                  render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                             <Input type="email" placeholder="m@example.com" disabled={loading} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : <><Mail className="mr-2"/> Send Reset Link</>}
                                </Button>
                                <Button variant="ghost" asChild>
                                  <Link href="/owner/login">Back to Login</Link>
                                </Button>
                            </form>
                            </Form>
                        </CardContent>
                    </>
                ) : (
                     <>
                        <CardHeader className="items-center text-center">
                           <CheckCircle className="h-16 w-16 text-green-500"/>
                            <CardTitle className="text-2xl">Check your email</CardTitle>
                            <CardDescription>
                                If an account with that email exists, we've sent a link to reset your password.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Link href="/owner/login" className="w-full">
                             <Button className="w-full" variant="outline">Back to Login</Button>
                           </Link>
                        </CardContent>
                    </>
                )}
            </Card>
            <Link href="/" className="absolute top-4 left-4 z-10">
                <Button variant="outline" size="icon">
                    <Home className="h-4 w-4" />
                </Button>
            </Link>
        </div>
    );
}
