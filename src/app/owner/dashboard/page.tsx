
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { User, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs, collectionGroup, doc, updateDoc, writeBatch, serverTimestamp, addDoc, documentId, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutDashboard, Moon, Sun, Bell, Users, IndianRupee, CheckCircle2, AlertCircle, MoreVertical, Copy, PieChart as PieChartIcon, User as UserIcon, Settings, Mail, Trash2, Loader2, Sparkles, PlusCircle, Pencil, History, CreditCard, FileWarning, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Owner, Tenant, Message, Payment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { AddTenantDialog } from '@/components/owner/add-tenant-dialog';
import { RecordPaymentDialog } from '@/components/owner/record-payment-dialog';
import { ViewHistoryDialog } from '@/components/owner/view-history-dialog';
import { RejectPaymentDialog } from '@/components/owner/reject-payment-dialog';
import { EditTenantDialog } from '@/components/owner/edit-tenant-dialog';
import { UpdateProfileDialog } from '@/components/owner/update-profile-dialog';
import { DeleteTenantDialog } from '@/components/owner/delete-tenant-dialog';
import { motion } from 'framer-motion';
import emailjs from '@emailjs/browser';
import { generateReminder } from '@/ai/flows/reminder-flow';
import { useUseCase } from '@/context/use-case-context';


type SectionVisibility = {
    stats: boolean;
    tenants: boolean;
    revenue: boolean;
    notifications: boolean;
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();
  const { terminology, setUseCase } = useUseCase();
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSendingReminder, setIsSendingReminder] = useState<string | null>(null);
  
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isViewHistoryOpen, setViewHistoryOpen] = useState(false);
  const [isRejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdateProfileOpen, setUpdateProfileOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prefilledAmount, setPrefilledAmount] = useState<number|undefined>(undefined);
  const [messageIdToVerify, setMessageIdToVerify] = useState<string|undefined>(undefined);

   const [sectionVisibility, setSectionVisibility] = useState<SectionVisibility>({
        stats: true,
        tenants: true,
        revenue: true,
        notifications: true,
    });

    useEffect(() => {
        const savedVisibility = localStorage.getItem('sectionVisibility');
        if (savedVisibility) {
            setSectionVisibility(JSON.parse(savedVisibility));
        }
    }, []);

    const toggleSection = (section: keyof SectionVisibility) => {
        const newVisibility = { ...sectionVisibility, [section]: !sectionVisibility[section] };
        setSectionVisibility(newVisibility);
        localStorage.setItem('sectionVisibility', JSON.stringify(newVisibility));
    }


  useEffect(() => {
    if (!user) {
        if (!loading) router.push('/owner/login');
        return;
    }
    
    const ownerQuery = query(collection(db, terminology.owner.collectionName), where('uid', '==', user.uid));
    const unsubscribeOwner = onSnapshot(ownerQuery, (snapshot) => {
        if (!snapshot.empty) {
        const ownerDoc = snapshot.docs[0];
        const ownerData = { id: ownerDoc.id, ...ownerDoc.data() } as Owner;
        setOwner(ownerData);
        if (typeof window !== 'undefined') {
            localStorage.setItem('ownerEmail', user.email || '');
        }

        // Setup tenants listener
        const tenantsQuery = query(collection(db, `${terminology.owner.collectionName}/${ownerDoc.id}/${terminology.tenant.collectionName}`));
        const unsubscribeTenants = onSnapshot(tenantsQuery, (tenantsSnapshot) => {
            const tenantsData = tenantsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tenant));
            setTenants(tenantsData);

            // Setup messages listener once we have tenants
            if (tenantsData.length > 0) {
                const messagesQuery = collectionGroup(db, 'messages');
                const unsubscribeMessages = onSnapshot(messagesQuery, (messagesSnapshot) => {
                    const ownerTenantIds = new Set(tenantsData.map(t => t.id));
                    const unreadMessages: Message[] = [];
                    messagesSnapshot.forEach(msgDoc => {
                        const tenantRef = msgDoc.ref.parent.parent;
                        if (tenantRef && ownerTenantIds.has(tenantRef.id)) {
                                const msgData = { id: msgDoc.id, tenantId: tenantRef.id, ...msgDoc.data() } as Message & {tenantId: string};
                                if (msgData.status === 'unread') {
                                unreadMessages.push(msgData);
                                }
                        }
                    });
                        // Client-side sort
                    setMessages(unreadMessages.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
                }, (error) => {
                    console.error("Error fetching messages: ", error);
                    const permissionError = new FirestorePermissionError({
                        path: 'messages',
                        operation: 'list'
                    });
                    errorEmitter.emit('permission-error', permissionError);
                });
                setLoading(false);
                return () => unsubscribeMessages();
            } else {
                setMessages([]);
                setLoading(false);
            }
        }, (error) => {
            console.error("Error fetching tenants: ", error);
            const permissionError = new FirestorePermissionError({
                path: `${terminology.owner.collectionName}/${ownerDoc.id}/${terminology.tenant.collectionName}`,
                operation: 'list'
            });
            errorEmitter.emit('permission-error', permissionError);
        });

        return () => unsubscribeTenants();
        } else {
        setLoading(false);
        // This could happen if the owner doc isn't created yet or rules deny access
        // We'll emit an error to be caught and displayed.
        const permissionError = new FirestorePermissionError({
            path: `${terminology.owner.collectionName}/${user.uid}`,
            operation: 'get'
        });
        errorEmitter.emit('permission-error', permissionError);
        }
    }, (error) => {
        console.error("Error fetching owner: ", error);
        const permissionError = new FirestorePermissionError({
            path: `${terminology.owner.collectionName}/${user.uid}`,
            operation: 'get'
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    
    return () => unsubscribeOwner();
  }, [user, router, terminology, db, loading]);


  const handleLogout = async () => {
    await signOut(auth);
    if (typeof window !== 'undefined') {
        localStorage.removeItem('ownerEmail');
    }
    router.push('/owner/login');
  };

  const handleChangeUseCase = () => {
    setUseCase(null);
    router.push('/');
  }

  const handleSendReminder = async (tenant: Tenant) => {
    if (!owner) return;
    setIsSendingReminder(tenant.id);

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey || serviceId.includes('YOUR_')) {
        toast({
            variant: "destructive",
            title: "EmailJS Not Configured",
            description: "Please add your EmailJS credentials to your .env.local file.",
        });
        setIsSendingReminder(null);
        return;
    }
    
    const balance = (tenant.rentAmount + (tenant.extraExpenses || 0) + (tenant.debt || 0)) - tenant.amountPaid;

    try {
        // Generate reminder
        const reminder = await generateReminder({
            tenantName: tenant.name.split(' ')[0],
            ownerName: owner.name,
            rentAmount: balance,
            dueDate: "this month" // This could be made more dynamic
        });

        const templateParams = {
            to_name: tenant.name,
            to_email: tenant.email,
            from_name: owner.name,
            reply_to: owner.email,
            subject: reminder.subject,
            message: reminder.body,
            year: new Date().getFullYear(),
        };

        await emailjs.send(serviceId, templateId, templateParams, publicKey);
        toast({ title: "Reminder Sent!", description: `A automated reminder has been sent to ${tenant.name}.` });

    } catch (error: any) {
        console.error("FAILED...", error);
        const errorMessage = (error && typeof error === 'object' && 'text' in error) ? (error as {text: string}).text : "Failed to send reminder. Check flow or EmailJS config.";
        toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
        setIsSendingReminder(null);
    }
};

  const totalDueThisCycle = useMemo(() => tenants.reduce((acc, t) => acc + (t.rentAmount + (t.extraExpenses || 0) + (t.debt || 0)), 0), [tenants]);
  const amountReceived = useMemo(() => tenants.reduce((acc, t) => acc + t.amountPaid, 0), [tenants]);
  const paidCount = useMemo(() => tenants.filter(t => t.status === 'paid').length, [tenants]);
  const unpaidCount = useMemo(() => tenants.filter(t => t.status === 'unpaid' || t.status === 'partial').length, [tenants]);

  const filteredTenants = useMemo(() => {
    if (filter === 'paid') return tenants.filter(t => t.status === 'paid');
    if (filter === 'unpaid') return tenants.filter(t => t.status === 'unpaid' || t.status === 'partial');
    return tenants.sort((a, b) => a.name.localeCompare(b.name));
  }, [tenants, filter]);

  const revenueData = [
      { name: 'Received', value: amountReceived, color: 'hsl(var(--primary))' },
      { name: 'Pending', value: Math.max(0, totalDueThisCycle - amountReceived), color: 'hsl(var(--muted))' }
  ];

  const getStatusBadge = (status: 'paid' | 'unpaid' | 'partial') => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'unpaid': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'partial': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        toast({ title: "Copied to clipboard!" });
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
  }
  
  const handleMarkAsPaid = async (tenant: Tenant) => {
    if (!owner) return;
    const totalOwed = (tenant.rentAmount + (tenant.extraExpenses || 0) + (tenant.debt || 0));
    const amountToRecord = totalOwed - tenant.amountPaid;

    const tenantRef = doc(db, `${terminology.owner.collectionName}/${owner.id}/${terminology.tenant.collectionName}/${tenant.id}`);
    
    try {
        const batch = writeBatch(db);
        
        // Update tenant document
        batch.update(tenantRef, {
            amountPaid: tenant.rentAmount + (tenant.extraExpenses || 0), // Amount paid is the full amount for the current cycle
            status: 'paid',
            debt: 0 // Clear all debt
        });

        // Record the final payment that clears the balance
        if (amountToRecord > 0) {
            const paymentRef = collection(db, `${terminology.owner.collectionName}/${owner.id}/${terminology.tenant.collectionName}/${tenant.id}/payments`);
            const newPaymentDoc = doc(paymentRef); // Create a new doc reference
            batch.set(newPaymentDoc, {
                amount: amountToRecord,
                paymentDate: serverTimestamp(),
                createdAt: serverTimestamp(),
                recordedBy: 'owner'
            });
        }

        await batch.commit();
        toast({ title: "Success", description: `${tenant.name} marked as fully paid.`});
    } catch(error) {
        console.error("Error marking as paid:", error);
        toast({ variant: "destructive", title: "Error", description: `Could not update ${terminology.tenant.singular} status.`});
    }
  };

  const handleMarkAsUnpaid = async (tenant: Tenant) => {
     if (!owner) return;
     const tenantRef = doc(db, `${terminology.owner.collectionName}/${owner.id}/${terminology.tenant.collectionName}/${tenant.id}`);
     const newDebt = (tenant.rentAmount + (tenant.extraExpenses || 0) + (tenant.debt || 0)) - tenant.amountPaid;
     
     try {
        await updateDoc(tenantRef, {
            amountPaid: 0,
            status: 'unpaid',
            debt: newDebt > 0 ? newDebt : 0 // Carry over the outstanding balance to debt
        });
        toast({ title: "Success", description: `${tenant.name} marked as unpaid. Balance carried over to next cycle.`});
     } catch (error) {
        console.error("Error marking as unpaid:", error);
        toast({ variant: "destructive", title: "Error", description: `Could not update ${terminology.tenant.singular} status.`});
     }
  };
  
  const handleVerifyPayment = async (message: Message) => {
    const tenant = tenants.find(t => t.id === message.tenantId);
    if(tenant) {
        setSelectedTenant(tenant);
        setPrefilledAmount(message.amount);
        setMessageIdToVerify(message.id)
        setRecordPaymentOpen(true);
    }
  };


  if (loading || !owner) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-7xl mx-auto space-y-6">
            <header className="flex justify-between items-center p-4">
                <Skeleton className="h-8 w-48" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </header>
            <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
             <div className="p-4 space-y-4">
                 <Skeleton className="h-10 w-1/3 mb-4" />
                 <Skeleton className="h-48 w-full rounded-xl" />
             </div>
        </div>
      </div>
    );
  }

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.8,
  };


  return (
    <motion.div 
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen bg-background text-foreground"
    >
        { selectedTenant && owner && (
            <>
            <RecordPaymentDialog
                isOpen={isRecordPaymentOpen}
                setIsOpen={setRecordPaymentOpen}
                tenant={selectedTenant}
                ownerId={owner.id}
                prefilledAmount={prefilledAmount}
                messageId={messageIdToVerify}
            />
            <ViewHistoryDialog 
                isOpen={isViewHistoryOpen}
                setIsOpen={setViewHistoryOpen}
                tenant={selectedTenant}
                ownerId={owner.id}
            />
            <EditTenantDialog 
                isOpen={isEditDialogOpen}
                setIsOpen={setEditDialogOpen}
                tenant={selectedTenant}
                ownerId={owner.id}
            />
             <DeleteTenantDialog
                isOpen={isDeleteDialogOpen}
                setIsOpen={setDeleteDialogOpen}
                tenant={selectedTenant}
                ownerId={owner.id}
            />
            </>
        )}
        { selectedMessage && owner && (
             <RejectPaymentDialog
                isOpen={isRejectDialogOpen}
                setIsOpen={setRejectDialogOpen}
                message={selectedMessage}
                ownerId={owner.id}
            />
        )}
        { owner && (
            <UpdateProfileDialog 
                isOpen={isUpdateProfileOpen}
                setIsOpen={setUpdateProfileOpen}
                owner={owner}
            />
        )}

      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center space-x-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <span className="inline-block font-bold">{terminology.appName}</span>
          </Link>
          <div className="flex items-center space-x-2">
             <Button variant="outline" size="sm" onClick={handleChangeUseCase}>
                <RefreshCw className="mr-2 h-4 w-4"/>
                Change Use Case
            </Button>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Customize View</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={sectionVisibility.stats} onCheckedChange={() => toggleSection('stats')}>Stats</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={sectionVisibility.tenants} onCheckedChange={() => toggleSection('tenants')}>{terminology.tenant.plural}</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={sectionVisibility.notifications} onCheckedChange={() => toggleSection('notifications')}>Notifications</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={sectionVisibility.revenue} onCheckedChange={() => toggleSection('revenue')}>{terminology.revenue.title}</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://robohash.org/${owner.email}?set=set5`} />
                            <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setUpdateProfileOpen(true)}>
                        <UserIcon className="mr-2 h-4 w-4"/> Update Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
       <main className="container py-6 max-w-7xl">
            <div className="text-left mb-6">
                <div>
                  <h1 className="text-3xl font-bold">Welcome, {owner.name.split(' ')[0]}!</h1>
                  <p className="text-muted-foreground">{terminology.owner.dashboardHeader}</p>
                </div>
            </div>
            
            <div className="flex flex-col space-y-6 mt-6">
                {sectionVisibility.stats && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="col-span-1 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 rounded-xl" onClick={() => document.getElementById('revenue')?.scrollIntoView({ behavior: 'smooth' })}>
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-medium">Total Due This Cycle</CardTitle>
                                <IndianRupee className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(totalDueThisCycle)}</div>
                                <p className="text-xs text-muted-foreground">{formatCurrency(amountReceived)} Money Received This Month</p>
                            </CardContent>
                        </Card>
                        <Card className={`col-span-1 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 rounded-xl ${filter === 'all' ? 'ring-2 ring-primary' : ''}`} onClick={() => setFilter('all')}>
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-medium">Total {terminology.tenant.plural}</CardTitle>
                                <Users className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{tenants.length}</div>
                            </CardContent>
                        </Card>
                        <Card className={`col-span-1 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 rounded-xl ${filter === 'paid' ? 'ring-2 ring-primary' : ''}`} onClick={() => setFilter('paid')}>
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-medium">Paid</CardTitle>
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{paidCount}</div>
                            </CardContent>
                        </Card>
                        <Card className={`col-span-1 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 rounded-xl ${filter === 'unpaid' ? 'ring-2 ring-primary' : ''}`} onClick={() => setFilter('unpaid')}>
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-medium">Unpaid/Partial</CardTitle>
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{unpaidCount}</div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="mt-6">
                        <AddTenantDialog ownerId={owner.id} />
                    </div>
                  </>
                )}
                
                {sectionVisibility.notifications && (
                <section id="notifications">
                     <Card className="rounded-xl shadow-lg md:mx-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bell className="text-primary"/> Payment Notifications</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-96 overflow-y-auto p-0 md:p-6 md:px-0">
                             {messages.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No new notifications.</p>}
                             {messages.map(msg => (
                                 <div key={msg.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-muted transition-colors border-b last:border-b-0 mx-2 md:mx-0">
                                    <div>
                                        <p className="font-semibold">{msg.tenantName} claims to have paid {formatCurrency(msg.amount)}</p>
                                        <p className="text-sm text-muted-foreground">
                                           {new Date(msg.createdAt.seconds * 1000).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleVerifyPayment(msg)}>Verify</Button>
                                        <Button size="sm" variant="destructive" onClick={() => { setSelectedMessage(msg); setRejectDialogOpen(true); }}>Reject</Button>
                                    </div>
                                 </div>
                             ))}
                         </CardContent>
                    </Card>
                </section>
                )}

                 {sectionVisibility.tenants && (
                 <section id="tenants">
                    <Card className="rounded-xl shadow-lg md:mx-0">
                        <CardHeader>
                            <CardTitle>{terminology.tenant.plural} Management</CardTitle>
                            <CardDescription>A list of your {terminology.tenant.plural.toLowerCase()} and their payment status.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 md:p-0">
                            {/* Mobile View: Cards */}
                            <div className="grid grid-cols-1 gap-4 md:hidden px-0">
                                {filteredTenants.length > 0 ? (
                                    filteredTenants.map(tenant => {
                                        const balance = (tenant.rentAmount + (tenant.extraExpenses || 0) + (tenant.debt || 0)) - tenant.amountPaid;
                                        return (
                                        <Card key={tenant.id} className="rounded-xl shadow-md hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 hover:scale-105">
                                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-12 w-12">
                                                        <AvatarImage src={tenant.avatar} alt={tenant.name} />
                                                        <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <CardTitle className="text-lg">{tenant.name}</CardTitle>
                                                        <CardDescription>{tenant.room}</CardDescription>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-5 w-5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => { setSelectedTenant(tenant); setPrefilledAmount(undefined); setMessageIdToVerify(undefined); setRecordPaymentOpen(true); }} disabled={tenant.status === 'paid'}>Record Payment</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleMarkAsPaid(tenant)} disabled={tenant.status === 'paid'}>Mark as Fully Paid</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleMarkAsUnpaid(tenant)} disabled={tenant.status === 'unpaid' && tenant.amountPaid === 0}>Mark as Unpaid</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => { setSelectedTenant(tenant); setViewHistoryOpen(true); }}>View History</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleSendReminder(tenant)} disabled={balance <= 0 || isSendingReminder === tenant.id}>
                                                            {isSendingReminder === tenant.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                                                            Send Reminder
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onSelect={() => { setSelectedTenant(tenant); setEditDialogOpen(true); }}>Edit {terminology.tenant.singular}</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => { setSelectedTenant(tenant); setDeleteDialogOpen(true); }} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/40">
                                                            <Trash2 className="mr-2 h-4 w-4"/>Delete {terminology.tenant.singular}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3 mt-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">Monthly {terminology.rent.singular}</span>
                                                        <span className="font-semibold">{formatCurrency(tenant.rentAmount)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">Extra Expenses</span>
                                                        <span className="font-semibold">{formatCurrency(tenant.extraExpenses || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">Previous Due</span>
                                                        <span className="font-semibold text-red-500">{formatCurrency(tenant.debt || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">Due</span>
                                                        <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-foreground'}`}>{formatCurrency(balance)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">Status</span>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(tenant.status)}`}>
                                                            {tenant.status}
                                                        </span>
                                                    </div>
                                                     <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">Registered On</span>
                                                        <span className="font-semibold">{formatDate(tenant.createdAt)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2 border-t mt-2">
                                                        <span className="text-muted-foreground">{terminology.roomCode.singular}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono bg-muted px-2 py-1 rounded">{tenant.roomCode}</span>
                                                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(tenant.roomCode)}>
                                                                <Copy className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                     <div className="flex justify-between items-center">
                                                        <span className="text-muted-foreground">Onboarding</span>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            {tenant.isRegistered ? (
                                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                            ) : (
                                                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                                            )}
                                                            <span className={tenant.isRegistered ? 'text-green-600' : 'text-amber-600'}>
                                                                {tenant.isRegistered ? 'Registered' : 'Pending'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )})
                                ) : (
                                    <p className="text-center text-muted-foreground py-8 col-span-full">No {terminology.tenant.plural.toLowerCase()} found for this filter.</p>
                                )}
                            </div>
                             {/* Desktop View: Table */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{terminology.tenant.singular}</TableHead>
                                            <TableHead>Monthly {terminology.rent.singular}</TableHead>
                                            <TableHead>Extra Expenses</TableHead>
                                            <TableHead>Previous Due</TableHead>
                                            <TableHead>Total Due</TableHead>
                                            <TableHead>Payment Status</TableHead>
                                            <TableHead>{terminology.roomCode.singular}</TableHead>
                                            <TableHead>Onboarding</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {filteredTenants.length > 0 ? (
                                        filteredTenants.map(tenant => {
                                            const balance = (tenant.rentAmount + (tenant.extraExpenses || 0) + (tenant.debt || 0)) - tenant.amountPaid;
                                            return (
                                                <TableRow key={tenant.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10">
                                                                <AvatarImage src={tenant.avatar} alt={tenant.name} />
                                                                <AvatarFallback>{tenant.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-medium">{tenant.name}</div>
                                                                <div className="text-sm text-muted-foreground">{tenant.room}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{formatCurrency(tenant.rentAmount)}</TableCell>
                                                    <TableCell>{formatCurrency(tenant.extraExpenses || 0)}</TableCell>
                                                    <TableCell className="text-red-500">{formatCurrency(tenant.debt || 0)}</TableCell>
                                                    <TableCell className={`${balance > 0 ? 'text-red-600 font-bold' : 'text-foreground'}`}>{formatCurrency(balance)}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(tenant.status)}`}>
                                                            {tenant.status}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono bg-muted px-2 py-1 rounded">{tenant.roomCode}</span>
                                                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(tenant.roomCode)}>
                                                                <Copy className="h-4 w-4"/>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            {tenant.isRegistered ? (
                                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                            ) : (
                                                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                                            )}
                                                            <span className={tenant.isRegistered ? 'text-green-600' : 'text-amber-600'}>
                                                                {tenant.isRegistered ? 'Registered' : 'Pending'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                         <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreVertical className="h-5 w-5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onSelect={() => { setSelectedTenant(tenant); setPrefilledAmount(undefined); setMessageIdToVerify(undefined); setRecordPaymentOpen(true); }} disabled={tenant.status === 'paid'}>Record Payment</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleMarkAsPaid(tenant)} disabled={tenant.status === 'paid'}>Mark as Fully Paid</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleMarkAsUnpaid(tenant)} disabled={tenant.status === 'unpaid' && tenant.amountPaid === 0}>Mark as Unpaid</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => { setSelectedTenant(tenant); setViewHistoryOpen(true); }}>View History</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleSendReminder(tenant)} disabled={balance <= 0 || isSendingReminder === tenant.id}>
                                                                    {isSendingReminder === tenant.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                                                                    Send Reminder
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onSelect={() => { setSelectedTenant(tenant); setEditDialogOpen(true); }}>Edit {terminology.tenant.singular}</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => { setSelectedTenant(tenant); setDeleteDialogOpen(true); }} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/40">
                                                                    <Trash2 className="mr-2 h-4 w-4"/>Delete {terminology.tenant.singular}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                                No {terminology.tenant.plural.toLowerCase()} found for this filter.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                 </section>
                 )}
                 
                 {sectionVisibility.revenue && (
                 <motion.section 
                    id="revenue"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                 >
                    <Card className="rounded-xl shadow-lg md:mx-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><PieChartIcon className="text-primary"/>{terminology.revenue.title} Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 md:px-0 pt-4 relative">
                           <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie 
                                      data={revenueData} 
                                      dataKey="value" 
                                      nameKey="name" 
                                      cx="50%" 
                                      cy="50%" 
                                      innerRadius={60}
                                      outerRadius={100} 
                                      paddingAngle={5}
                                      labelLine={false}
                                      >
                                        {revenueData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} className="transition-transform duration-300 hover:opacity-80 stroke-background hover:stroke-primary/50" strokeWidth={2}/>)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `${formatCurrency(value)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                <p className="text-xs text-muted-foreground">Total Received</p>
                                <p className="text-3xl font-bold">{formatCurrency(amountReceived)}</p>
                             </div>
                        </CardContent>
                    </Card>
                 </motion.section>
                )}

                <section id="actions-guide">
                    <Card className="rounded-xl shadow-lg relative overflow-hidden bg-card/60 backdrop-blur-xl md:mx-0">
                         <div className="absolute inset-0 bg-primary/10 -z-10 animate-pulse-slow-glow"></div>
                         <CardHeader>
                             <CardTitle>Actions Guide</CardTitle>
                             <CardDescription>An overview of the available {terminology.tenant.singular.toLowerCase()} actions from the dropdown menu.</CardDescription>
                         </CardHeader>
                         <CardContent>
                             <ul className="space-y-3 text-sm">
                                 <li className="flex items-center gap-3">
                                     <CreditCard className="h-5 w-5 text-sky-500" />
                                     <div><strong className="text-sky-500">Record Payment:</strong> Manually log a payment received from the {terminology.tenant.singular.toLowerCase()}.</div>
                                 </li>
                                 <li className="flex items-center gap-3">
                                     <CheckCircle2 className="h-5 w-5 text-green-500" />
                                     <div><strong className="text-green-500">Mark as Paid/Unpaid:</strong> Quickly update the {terminology.tenant.singular.toLowerCase()}'s status or reset their balance.</div>
                                 </li>
                                  <li className="flex items-center gap-3">
                                     <History className="h-5 w-5 text-blue-500" />
                                     <div><strong className="text-blue-500">View History:</strong> See a chronological list of all recorded payments.</div>
                                 </li>
                                 <li className="flex items-center gap-3">
                                     <Sparkles className="h-5 w-5 text-amber-500" />
                                     <div><strong className="text-amber-500">Send Reminder:</strong> Use automation to send a polite, unique reminder for outstanding dues.</div>
                                 </li>
                                 <li className="flex items-center gap-3">
                                     <Pencil className="h-5 w-5 text-violet-500" />
                                     <div><strong className="text-violet-500">Edit {terminology.tenant.singular}:</strong> Modify {terminology.tenant.singular.toLowerCase()} details like name, {terminology.rent.singular.toLowerCase()} amount, etc.</div>
                                 </li>
                                 <li className="flex items-center gap-3">
                                     <Trash2 className="h-5 w-5 text-red-500" />
                                     <div><strong className="text-red-500">Delete {terminology.tenant.singular}:</strong> Permanently remove a {terminology.tenant.singular.toLowerCase()} and all their associated data.</div>
                                 </li>
                             </ul>
                         </CardContent>
                     </Card>
                 </section>
            </div>
       </main>
    </motion.div>
  );
}

    