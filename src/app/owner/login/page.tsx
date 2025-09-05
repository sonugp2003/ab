
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Loader2, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useUseCase } from '@/context/use-case-context';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function OwnerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { terminology } = useUseCase();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const ownersRef = collection(db, terminology.owner.collectionName);
      const q = query(ownersRef, where("uid", "==", userCredential.user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await signOut(auth);
        setError(`No ${terminology.owner.singular.toLowerCase()} account found with this email for this use case. Please sign up.`);
        setLoading(false);
        return;
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('ownerEmail', email);
      }
      router.push('/owner/dashboard');

    } catch (error: any) {
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            setError("Your email or password may be incorrect. Please try again.");
        } else {
            setError("An unexpected error occurred. Please try again later.");
        }
        console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{terminology.owner.title} Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-4">
               {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Login Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/owner/forgot-password" className="ml-auto inline-block text-sm underline">
                    Forgot your password?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Login'}
              </Button>
              <Button variant="outline" className="w-full" asChild>
                  <Link href="/owner/register">
                      Sign up
                  </Link>
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            <Link href="/tenant/login" className="underline">
              Are you a {terminology.tenant.singular.toLowerCase()}? Login here
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
