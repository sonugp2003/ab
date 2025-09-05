
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useUseCase } from '@/context/use-case-context';

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  mobileNumber: z.string().length(10, "Mobile number must be 10 digits"),
  address: z.string().min(1, "Property address is required"),
  upiId: z.string().min(1, "UPI ID is required"),
});

export default function OwnerRegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { terminology } = useUseCase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      mobileNumber: "",
      address: "",
      upiId: "",
    },
  });

  const createOwnerDocument = async (uid: string, values: z.infer<typeof formSchema>) => {
     // Check if owner document already exists for this use case
      const ownerQuery = query(collection(db, terminology.owner.collectionName), where('uid', '==', uid));
      const ownerSnapshot = await getDocs(ownerQuery);

      if (!ownerSnapshot.empty) {
          toast({
              variant: "destructive",
              title: "Account Already Exists",
              description: `You already have a ${terminology.owner.singular.toLowerCase()} account. Please log in.`,
          });
          throw new Error("account-exists");
      }


    await addDoc(collection(db, terminology.owner.collectionName), {
        uid: uid,
        name: `${values.firstName} ${values.lastName}`,
        email: values.email,
        mobileNumber: values.mobileNumber,
        address: values.address,
        upiId: values.upiId,
        createdAt: serverTimestamp(),
      });
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await createOwnerDocument(userCredential.user.uid, values);

      toast({
        title: "Account Created Successfully",
        description: "Redirecting to your dashboard...",
      });

      router.push('/owner/dashboard');

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            // This is OK. The user might be signing up for a different role.
            // We just need to log them in to get their UID.
            try {
                const existingUserCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
                await createOwnerDocument(existingUserCredential.user.uid, values);
                
                toast({
                    title: "Account Created Successfully",
                    description: "Redirecting to your dashboard...",
                });

                router.push('/owner/dashboard');

            } catch (authError: any) {
                if (authError.message === 'account-exists') {
                    // This error is thrown from createOwnerDocument, do nothing extra.
                } else if (authError.code === 'auth/wrong-password') {
                     toast({
                        variant: "destructive",
                        title: "Registration Failed",
                        description: "An account with this email already exists, but the password provided is incorrect.",
                    });
                } else {
                    console.error("Registration failed during login attempt:", authError);
                    toast({
                        variant: "destructive",
                        title: "Registration Failed",
                        description: authError.message || "An unexpected error occurred.",
                    });
                }
            }
        } else {
            console.error("Registration failed:", error);
            toast({
                variant: "destructive",
                title: "Registration Failed",
                description: error.message || "An unexpected error occurred.",
            });
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="mx-auto max-w-lg w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">{terminology.owner.title} Registration</CardTitle>
          <CardDescription>Enter your information to create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input placeholder="Max" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Robinson" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="10-digit number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{terminology.address.singular}</FormLabel>
                    <FormControl>
                      <Input placeholder={terminology.address.placeholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="upiId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UPI ID</FormLabel>
                    <FormControl>
                      <Input placeholder="yourname@bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Create an account'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/owner/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
      <Link href="/" className="absolute top-4 left-4 z-10">
        <Button variant="outline" size="icon">
          <Home className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
