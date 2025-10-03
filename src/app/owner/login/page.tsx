
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Loader2, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db, googleProvider } from '@/lib/firebase';
import { useUseCase } from '@/context/use-case-context';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

export default function OwnerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const ownersRef = collection(db, terminology.owner.collectionName);
      const q = query(ownersRef, where("uid", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // This is a new Google Sign-In user, create a document for them.
        // We need more info, so redirect them to a more complete registration form.
        // For simplicity now, we can auto-create a document with partial info
        // and let them update it later.
        await addDoc(collection(db, terminology.owner.collectionName), {
          uid: user.uid,
          name: user.displayName || 'New User',
          email: user.email,
          mobileNumber: user.phoneNumber || '',
          address: '', // Needs to be filled in later
          upiId: '', // Needs to be filled in later
          createdAt: serverTimestamp(),
        });
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('ownerEmail', user.email || '');
      }

      router.push('/owner/dashboard');
    } catch (error: any) {
        setError("Failed to sign in with Google. Please try again.");
        console.error("Google sign-in failed:", error);
    } finally {
        setGoogleLoading(false);
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
          <div className="grid gap-4">
             {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading || googleLoading}>
               {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Image src="/google.svg" alt="Google icon" width={16} height={16} className="mr-2" />}
              Sign in with Google
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || googleLoading}
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
                  disabled={loading || googleLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Login'}
              </Button>
            </form>
             <div className="text-center text-sm">
                Don't have an account?{' '}
                <Link href="/owner/register" className="underline">
                    Sign up
                </Link>
             </div>
          </div>
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
