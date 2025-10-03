
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Home, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { auth, db, googleProvider } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { useUseCase } from '@/context/use-case-context';
import Image from 'next/image';

const formSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  // Password is now optional because a Google user won't have one initially
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  mobileNumber: z.string().length(10, "Mobile number must be 10 digits"),
  address: z.string().min(1, "Property address is required"),
  upiId: z.string().min(1, "UPI ID is required"),
}).refine(data => {
    // If there's no password, it's a Google sign-up flow, which is fine.
    // If there is a password, it must meet the length requirement.
    return data.password === undefined || data.password.length >= 6;
}, {
    message: "Password must be at least 6 characters",
    path: ["password"],
});


export default function OwnerRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isGoogleSignUp, setIsGoogleSignUp] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { terminology } = useUseCase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      mobileNumber: "",
      address: "",
      upiId: "",
    },
  });

   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            // Check if this is a redirect from Google Sign-In
            const googleAuthUser = sessionStorage.getItem('google_auth_user');
            if (googleAuthUser) {
                const { displayName, email } = JSON.parse(googleAuthUser);
                form.reset({
                    name: displayName || '',
                    email: email || '',
                });
                setIsGoogleSignUp(true);
                // Clean up session storage
                sessionStorage.removeItem('google_auth_user');
            }
        }
    });
    return () => unsubscribe();
  }, [form]);

  const createOwnerDocument = async (uid: string, data: z.infer<typeof formSchema>) => {
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
        name: data.name,
        email: data.email,
        mobileNumber: data.mobileNumber,
        address: data.address,
        upiId: data.upiId,
        createdAt: serverTimestamp(),
      });
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    
    // Case 1: User is already signed in with Google and is completing their profile
    if (isGoogleSignUp && user) {
        try {
            await createOwnerDocument(user.uid, values);
            toast({ title: "Registration Complete!", description: "Your account has been created." });
            router.push('/owner/dashboard');
        } catch (error: any) {
             if (error.message !== 'account-exists') {
                toast({ variant: "destructive", title: "Registration Failed", description: error.message });
             }
        } finally {
            setLoading(false);
        }
        return;
    }

    // Case 2: Standard email/password sign-up
    if (!values.password) {
        form.setError("password", { message: "Password is required for email sign-up."});
        setLoading(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await createOwnerDocument(userCredential.user.uid, values);

      toast({ title: "Account Created Successfully", description: "Redirecting to your dashboard..." });
      router.push('/owner/dashboard');

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            try {
                // Try to sign them in to check if password is correct
                await signInWithEmailAndPassword(auth, values.email, values.password!);
                // If sign-in succeeds, it means they have an account but maybe not for this role
                toast({ variant: "destructive", title: "Login Instead", description: "An account with this email already exists. Please log in."});
                router.push('/owner/login');
            } catch (authError: any) {
                if (authError.code === 'auth/wrong-password') {
                     toast({ variant: "destructive", title: "Registration Failed", description: "An account with this email exists, but the password provided is incorrect." });
                } else {
                    toast({ variant: "destructive", title: "Registration Failed", description: authError.message || "An unexpected error occurred." });
                }
            }
        } else {
            toast({ variant: "destructive", title: "Registration Failed", description: error.message || "An unexpected error occurred." });
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="mx-auto max-w-lg w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">{isGoogleSignUp ? 'Complete Your Profile' : `${terminology.owner.title} Registration`}</CardTitle>
          <CardDescription>
            {isGoogleSignUp ? 'Just a few more details and you\'ll be all set.' : 'Enter your information to create an account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!isGoogleSignUp && (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Sign up with email
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Max Robinson" {...field} disabled={loading || isGoogleSignUp} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="m@example.com" {...field} disabled={loading || isGoogleSignUp}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!isGoogleSignUp && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} disabled={loading}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}
               <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="10-digit number" {...field} disabled={loading}/>
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
                      <Input placeholder={terminology.address.placeholder} {...field} disabled={loading}/>
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
                      <Input placeholder="yourname@bank" {...field} disabled={loading}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : (isGoogleSignUp ? 'Complete Registration' : 'Create an account')}
              </Button>
            </form>
          </Form>
          {!isGoogleSignUp && (
            <div className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <Link href="/owner/login" className="underline">
                Sign in
                </Link>
            </div>
          )}
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
