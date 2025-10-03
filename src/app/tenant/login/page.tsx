
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { useUseCase } from '@/context/use-case-context';

export default function TenantLoginPage() {
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { terminology } = useUseCase();
  const db = useFirestore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
        toast({
            variant: "destructive",
            title: `${terminology.roomCode.singular} is required.`,
        });
        return;
    }
    setLoading(true);

    try {
        const ownersRef = collection(db, terminology.owner.collectionName);
        const ownersSnapshot = await getDocs(ownersRef);
        let tenantDoc: QueryDocumentSnapshot<DocumentData> | null = null;

        for (const ownerDoc of ownersSnapshot.docs) {
             const tenantsRef = collection(db, `${terminology.owner.collectionName}/${ownerDoc.id}/${terminology.tenant.collectionName}`);
             const q = query(tenantsRef, where('roomCode', '==', roomCode.trim()));
             const querySnapshot = await getDocs(q);

             if (!querySnapshot.empty) {
                 tenantDoc = querySnapshot.docs[0];
                 break; // Found the tenant, exit the loop
             }
        }


        if (!tenantDoc) {
            toast({
                variant: "destructive",
                title: `Invalid ${terminology.roomCode.singular}`,
                description: `The ${terminology.roomCode.singular.toLowerCase()} you entered does not exist. Please check and try again.`,
            });
            setLoading(false);
            return;
        }

        const tenantData = tenantDoc.data();

        if (!tenantData.isRegistered) {
             toast({
                variant: "destructive",
                title: "Onboarding Not Complete",
                description: "Please complete your registration before logging in.",
            });
             router.push('/tenant/onboarding');
             return;
        }
        
        // Save the full path to the document for the tenant dashboard
        if (typeof window !== 'undefined') {
            localStorage.setItem('tenantDocPath', tenantDoc.ref.path);
        }

        toast({
            title: "Login Successful",
            description: "Redirecting to your dashboard...",
        });

        router.push('/tenant/dashboard');

    } catch (error: any) {
        console.error("Tenant login failed:", error);
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{terminology.tenant.title} Login</CardTitle>
          <CardDescription>
            Enter your {terminology.roomCode.singular} to login to your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="room-code">{terminology.roomCode.singular}</Label>
                <Input
                  id="room-code"
                  placeholder="ABCXYZ"
                  required
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Login'}
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            New here?{' '}
            <Link href="/tenant/onboarding" className="underline">
              Complete your onboarding
            </Link>
          </div>
           <div className="mt-2 text-center text-sm">
            <Link href="/owner/login" className="underline">
              Are you an {terminology.owner.singular.toLowerCase()}? Login here
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
