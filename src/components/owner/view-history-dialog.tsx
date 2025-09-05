
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import type { Tenant, Payment } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { useUseCase } from '@/context/use-case-context';

interface ViewHistoryDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    tenant: Tenant;
    ownerId: string;
}

export function ViewHistoryDialog({ isOpen, setIsOpen, tenant, ownerId }: ViewHistoryDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { terminology } = useUseCase();

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const paymentsQuery = query(collection(db, `${terminology.owner.collectionName}/${ownerId}/${terminology.tenant.collectionName}/${tenant.id}/payments`), orderBy('paymentDate', 'desc'));
    
    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
        const paymentsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Payment);
        setPayments(paymentsData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching payment history:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch payment history."
        });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, ownerId, tenant.id, toast, terminology]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Date not available';
    return new Date(timestamp.seconds * 1000).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment History for {tenant.name}</DialogTitle>
          <DialogDescription>
            A chronological record of all payments made by this {terminology.tenant.singular.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border">
            <div className="p-4">
                {loading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : payments.length > 0 ? (
                    payments.map(payment => (
                        <div key={payment.id} className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
                            <span className="flex h-2 w-2 translate-y-1 rounded-full bg-primary" />
                            <div className="grid gap-1">
                                <p className="font-semibold text-lg">{formatCurrency(payment.amount)}</p>
                                <p className="text-sm text-muted-foreground">{formatDate(payment.paymentDate)}</p>
                                <p className="text-xs text-muted-foreground capitalize">Recorded by: {payment.recordedBy}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-8">No payment history found.</p>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
