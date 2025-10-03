
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
import { Home, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, getDocs, updateDoc, DocumentData, QueryDocumentSnapshot, collectionGroup } from 'firebase/firestore';
import { useUseCase } from '@/context/use-case-context';

const formSchema = z.object({
  roomCode: z.string().min(1, "This field is required"),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
});

export default function TenantOnboardingPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { terminology } = useUseCase();
  const db = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomCode: "",
      fullName: "",
      email: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    let tenantDoc: QueryDocumentSnapshot<DocumentData> | null = null;
    try {
        const tenantsQuery = query(collectionGroup(db, terminology.tenant.collectionName), where('roomCode', '==', values.roomCode));
        const querySnapshot = await getDocs(tenantsQuery);

        if (!querySnapshot.empty) {
            tenantDoc = querySnapshot.docs[0];
        }


      if (!tenantDoc) {
        toast({
          variant: "destructive",
          title: `Invalid ${terminology.roomCode.singular}`,
          description: `This ${terminology.roomCode.singular.toLowerCase()} does not exist. Please check with your ${terminology.owner.singular.toLowerCase()}.`,
        });
        setLoading(false);
        return;
      }

      const tenantData = tenantDoc.data();

      if (tenantData.isRegistered) {
        toast({
          variant: "destructive",
          title: "Already Registered",
          description: `This ${terminology.roomCode.singular.toLowerCase()} has already been used for onboarding. Please login instead.`,
        });
        router.push('/tenant/login');
        return;
      }

      const updatedData = {
        name: values.fullName,
        email: values.email,
        isRegistered: true,
      };

      await updateDoc(tenantDoc.ref, updatedData)
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: tenantDoc!.ref.path,
                operation: 'update',
                requestResourceData: updatedData,
            });
            errorEmitter.emit('permission-error', permissionError);
            // Re-throw to be caught by the outer catch block
            throw serverError;
        });

      toast({
        title: "Onboarding Successful!",
        description: `You can now log in with your ${terminology.roomCode.singular.toLowerCase()}.`,
      });

      router.push('/tenant/login');

    } catch (error: any) {
      console.error("Onboarding failed:", error);
       // The permission error should be emitted by the .catch block.
       // This toast will now only show for other types of errors.
       if (!tenantDoc) { // Only show this if the doc was never found in the first place
            toast({
                variant: "destructive",
                title: "Onboarding Failed",
                description: "An unexpected error occurred. Please try again later.",
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
          <CardTitle className="text-xl">{terminology.tenant.title} Onboarding</CardTitle>
          <CardDescription>Please enter your details to complete registration.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="roomCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{terminology.roomCode.singular}</FormLabel>
                    <FormControl>
                      <Input placeholder={`Enter the code from your ${terminology.owner.singular.toLowerCase()}`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
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
                      <Input type="email" placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Complete Registration'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already registered?{' '}
            <Link href="/tenant/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
      <Link href="/" className="absolute top-4 left-4">
        <Button variant="outline" size="icon">
          <Home className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
