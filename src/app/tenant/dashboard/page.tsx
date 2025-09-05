
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';
import { Moon, Sun, Home, LogOut, CheckCircle2, AlertCircle, IndianRupee, Copy, Send, QrCode, XCircle, RefreshCw } from 'lucide-react';
import type { Tenant, Owner, Payment, Message } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUseCase } from '@/context/use-case-context';

// Augmenting types locally for the activity feed
type ActivityItem = (Payment & {type: 'payment'}) | (Message & {type: 'message'});


export default function TenantDashboardPage() {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();
  const { terminology, setUseCase } = useUseCase();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isNotifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [isQrCodeOpen, setQrCodeOpen] = useState(false);
  
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    const tenantDocPath = localStorage.getItem('tenantDocPath');
    if (!tenantDocPath) {
      router.push('/tenant/login');
      return;
    }

    const unsubscribeTenant = onSnapshot(doc(db, tenantDocPath), (doc) => {
      if (doc.exists()) {
        const tenantData = { id: doc.id, ...doc.data() } as Tenant;
        setTenant(tenantData);

        const ownerRef = doc.ref.parent.parent;
        if(ownerRef) {
            onSnapshot(ownerRef, (ownerDoc) => {
                if (ownerDoc.exists()) {
                    setOwner({ id: ownerDoc.id, ...ownerDoc.data() } as Owner);
                }
            });
        }
        
        let paymentsData: (Payment & {type: 'payment'})[] = [];
        let messagesData: (Message & {type: 'message'})[] = [];
        let paymentsLoaded = false;
        let messagesLoaded = false;

        const updateActivity = () => {
          if (paymentsLoaded && messagesLoaded) {
            const combinedActivity = [...paymentsData, ...messagesData];
            if (combinedActivity.length > 0) {
              const sortedActivity = combinedActivity.sort((a,b) => {
                  const timeA = a.createdAt?.toMillis() || 0;
                  const timeB = b.createdAt?.toMillis() || 0;
                  return timeB - timeA;
              });
              setActivity(sortedActivity);
            }
          }
        };

        // Fetch Payments
        const paymentsQuery = query(collection(db, `${tenantDocPath}/payments`), orderBy('createdAt', 'desc'));
        const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
            paymentsData = snapshot.docs.map(d => ({...d.data(), type: 'payment' }) as (Payment & {type: 'payment'}));
            paymentsLoaded = true;
            updateActivity();
        });
        
        // Fetch Messages
        const messagesQuery = query(collection(db, `${tenantDocPath}/messages`), orderBy('createdAt', 'desc'));
        const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
            messagesData = snapshot.docs.map(d => ({...d.data(), type: 'message'}) as (Message & {type: 'message'}));
            messagesLoaded = true;
            updateActivity();
        });

        return () => {
            unsubscribePayments();
            unsubscribeMessages();
        }

      } else {
        localStorage.removeItem('tenantDocPath');
        router.push('/tenant/login');
      }
    });

    return () => {
        if(unsubscribeTenant) unsubscribeTenant();
    }
  }, [router]);
  
  useEffect(() => {
     if(tenant && owner) {
        setLoading(false);
    }
  }, [tenant, owner]);

  const handleLogout = () => {
    localStorage.removeItem('tenantDocPath');
    router.push('/tenant/login');
  };

  const handleChangeUseCase = () => {
    setUseCase(null);
    router.push('/');
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  const totalDue = tenant ? tenant.rentAmount + (tenant.extraExpenses || 0) : 0;
  const balance = tenant ? totalDue - tenant.amountPaid : 0;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        toast({ title: "Copied to clipboard!" });
    });
  };

  const handleGenerateQr = () => {
      if(!owner || !paymentAmount) return;
      const amount = Number(paymentAmount);
      if (amount <= 0 || amount > balance) {
          toast({ variant: 'destructive', title: 'Invalid Amount', description: `Please enter an amount between ${formatCurrency(1)} and ${formatCurrency(balance)}`});
          return;
      }
      const upiString = `upi://pay?pa=${owner.upiId}&pn=${encodeURIComponent(owner.name)}&am=${amount}&cu=INR`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`);
      setQrCodeOpen(true);
  }
  
  const handleNotify = async () => {
       const amount = Number(paymentAmount);
       if(!tenant || !owner || amount <= 0 || amount > balance) {
           toast({ variant: 'destructive', title: 'Invalid Amount'});
           return;
       }
       setLoading(true);
       try {
           const messagesRef = collection(db, `${terminology.owner.collectionName}/${owner.id}/${terminology.tenant.collectionName}/${tenant.id}/messages`);
           await addDoc(messagesRef, {
               amount,
               tenantName: tenant.name,
               createdAt: serverTimestamp(),
               status: 'unread'
           });
           toast({ title: 'Notification Sent!', description: `Your ${terminology.owner.singular.toLowerCase()} has been notified of your payment.`});
           setNotifyDialogOpen(false);
           setPaymentDialogOpen(false);
           setPaymentAmount('');

       } catch (error) {
           toast({ variant: 'destructive', title: 'Error', description: 'Could not send notification.'});
       } finally {
           setLoading(false);
       }
  }


  if (loading || !tenant || !owner) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
         <div className="w-full max-w-4xl mx-auto space-y-6">
            <header className="flex justify-between items-center p-4 border-b">
                <Skeleton className="h-8 w-48" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </header>
             <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-4">
                <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
                <div className="space-y-6">
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
             <Image src="/logo.png" alt="Roommate Hub Logo" width={32} height={32} data-ai-hint="logo building" />
            <span className="inline-block font-bold">{terminology.appName}</span>
          </Link>
          <div className="flex items-center space-x-2">
             <Button variant="outline" size="sm" onClick={handleChangeUseCase}>
                <RefreshCw className="mr-2 h-4 w-4"/>
                Change Use Case
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Welcome, {tenant.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">{terminology.tenant.dashboardHeader}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
             <Card className="rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {tenant.status === 'paid' ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <CheckCircle2 className="w-24 h-24 text-green-500" />
                    <p className="text-2xl font-semibold">All Cleared!</p>
                    <p className="text-muted-foreground">{terminology.tenant.paidMessage}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-left">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Due</p>
                            <p className="text-2xl font-bold">{formatCurrency(totalDue)}</p>
                        </div>
                         <div>
                            <p className="text-sm text-muted-foreground">Amount Paid</p>
                            <p className="text-2xl font-bold text-green-500">{formatCurrency(tenant.amountPaid)}</p>
                        </div>
                         <div>
                            <p className="text-sm text-muted-foreground">Balance</p>
                            <p className="text-2xl font-bold text-red-500">{formatCurrency(balance)}</p>
                        </div>
                    </div>
                    <Dialog open={isPaymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                        <DialogTrigger asChild>
                           <Button className="w-full mt-6" size="lg">
                             <IndianRupee className="mr-2" /> Make a Payment
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Make a Payment</DialogTitle>
                                <DialogDescription>Pay your {terminology.rent.singular.toLowerCase()} using the {terminology.owner.singular.toLowerCase()}'s UPI details.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{terminology.owner.singular}'s UPI ID</p>
                                        <p className="font-mono font-semibold">{owner.upiId}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(owner.upiId)}><Copy/></Button>
                                </div>
                                <div className="space-y-2">
                                     <Label htmlFor="payment-amount">Amount</Label>
                                     <Input 
                                        id="payment-amount" 
                                        type="number" 
                                        placeholder={`Enter amount up to ${formatCurrency(balance)}`}
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                     />
                                </div>
                                <Button className="w-full" disabled={!paymentAmount || Number(paymentAmount) <= 0} onClick={handleGenerateQr}>
                                    <QrCode className="mr-2" /> Generate and Open QR Code
                                </Button>
                                 <Dialog open={isNotifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
                                     <DialogTrigger asChild>
                                        <Button className="w-full" variant="outline" disabled={!paymentAmount}>
                                            <Send className="mr-2"/> Notify After Payment
                                        </Button>
                                     </DialogTrigger>
                                     <DialogContent>
                                         <DialogHeader>
                                             <DialogTitle>Confirm Payment Notification</DialogTitle>
                                             <DialogDescription>
                                                 You are about to notify your {terminology.owner.singular.toLowerCase()} that you have paid {formatCurrency(Number(paymentAmount))}.
                                             </DialogDescription>
                                         </DialogHeader>
                                         <DialogFooter>
                                             <Button variant="ghost" onClick={() => setNotifyDialogOpen(false)}>Cancel</Button>
                                             <Button onClick={handleNotify} disabled={loading}>
                                                {loading ? "Sending..." : "Confirm & Send"}
                                             </Button>
                                         </DialogFooter>
                                     </DialogContent>
                                 </Dialog>
                            </div>
                        </DialogContent>
                    </Dialog>
                     <Dialog open={isQrCodeOpen} onOpenChange={setQrCodeOpen}>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Scan to Pay</DialogTitle>
                                <DialogDescription>Use any UPI app to scan this QR code.</DialogDescription>
                             </DialogHeader>
                             <div className="flex items-center justify-center p-4">
                                {qrCodeUrl ? <Image src={qrCodeUrl} alt="UPI QR Code" width={200} height={200}/> : <Skeleton className="w-[200px] h-[200px]" />}
                             </div>
                        </DialogContent>
                     </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-lg">
                <CardHeader>
                    <CardTitle>Activity Feed</CardTitle>
                    <CardDescription>Your recent payment activities.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                   {activity.length === 0 && <p className="text-muted-foreground text-center py-4">No recent activity.</p>}
                   {activity.map((item, index) => (
                       <div key={index} className="flex items-start gap-4">
                            <div>
                                {item.type === 'payment' ? <CheckCircle2 className="w-6 h-6 text-green-500 mt-1" /> :
                                 item.status === 'unread' ? <AlertCircle className="w-6 h-6 text-amber-500 mt-1" /> :
                                 item.status === 'verified' ? <CheckCircle2 className="w-6 h-6 text-green-500 mt-1" /> :
                                 <XCircle className="w-6 h-6 text-red-500 mt-1" />
                                }
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold">
                                    {item.type === 'payment' ? `Payment Verified` : 
                                     item.status === 'unread' ? `Notification Sent` :
                                     item.status === 'verified' ? `Payment Verified` :
                                     `Notification Rejected`}
                                </p>
                                <p className="text-sm">
                                    Amount: {formatCurrency(item.amount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString() : ''}
                                </p>
                                {item.type === 'message' && item.status === 'rejected' && item.rejectionReason && (
                                     <p className="text-xs text-red-500 mt-1">Reason: {item.rejectionReason}</p>
                                )}
                            </div>
                       </div>
                   ))}
                </CardContent>
            </Card>

          </div>
          <div className="space-y-6">
            <Card className="rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-semibold">{tenant.name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-semibold">{tenant.email}</span>
                </div>
              </CardContent>
            </Card>
             <Card className="rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle>{terminology.property.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">{terminology.address.singular}</span>
                    <span className="font-semibold text-right">{owner.address}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">{terminology.room.singular}</span>
                    <span className="font-semibold">{tenant.room}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">{terminology.owner.singular}</span>
                    <span className="font-semibold">{owner.name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Registered On</span>
                    <span className="font-semibold">{formatDate(tenant.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

    