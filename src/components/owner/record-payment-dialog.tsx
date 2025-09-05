
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, collection, addDoc, writeBatch, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Tenant } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useUseCase } from '@/context/use-case-context';

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  discrepancyReason: z.string().optional(),
});

interface RecordPaymentDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    tenant: Tenant;
    ownerId: string;
    prefilledAmount?: number;
    messageId?: string;
}

export function RecordPaymentDialog({ isOpen, setIsOpen, tenant, ownerId, prefilledAmount, messageId }: RecordPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { terminology } = useUseCase();

  const totalDue = tenant.rentAmount + (tenant.extraExpenses || 0);
  const balance = totalDue - tenant.amountPaid;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: prefilledAmount || (balance > 0 ? balance : 0),
      discrepancyReason: "",
    },
  });

  const watchedAmount = form.watch('amount');
  const showDiscrepancyReason = prefilledAmount !== undefined && watchedAmount < prefilledAmount;

  useEffect(() => {
    if (isOpen) {
        form.reset({
            amount: prefilledAmount || (balance > 0 ? balance : 0),
            discrepancyReason: "",
        })
    }
  }, [isOpen, prefilledAmount, balance, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (showDiscrepancyReason && !values.discrepancyReason) {
        form.setError("discrepancyReason", { type: "manual", message: "A reason is required for the amount discrepancy." });
        return;
    }
      
    setLoading(true);
    try {
        const batch = writeBatch(db);
        const tenantRef = doc(db, `${terminology.owner.collectionName}/${ownerId}/${terminology.tenant.collectionName}/${tenant.id}`);
        const paymentsRef = collection(db, `${terminology.owner.collectionName}/${ownerId}/${terminology.tenant.collectionName}/${tenant.id}/payments`);

        const newAmountPaid = tenant.amountPaid + values.amount;
        let newStatus: Tenant['status'] = 'partial';
        if (newAmountPaid >= totalDue) {
            newStatus = 'paid';
        }

        batch.update(tenantRef, {
            amountPaid: newAmountPaid,
            status: newStatus
        });
        
        batch.set(doc(paymentsRef), {
            amount: values.amount,
            paymentDate: serverTimestamp(),
            createdAt: serverTimestamp(), // for sorting in activity feed
            recordedBy: 'owner',
        });
        
        // If there was a discrepancy, reject the original message with a reason
        if (showDiscrepancyReason && messageId && values.discrepancyReason) {
            const messageRef = doc(db, `${terminology.owner.collectionName}/${ownerId}/${terminology.tenant.collectionName}/${tenant.id}/messages/${messageId}`);
            batch.update(messageRef, {
                status: 'rejected',
                rejectionReason: values.discrepancyReason,
            });
        }


        await batch.commit();
        
        toast({
            title: "Payment Recorded",
            description: `Payment of ${formatCurrency(values.amount)} for ${tenant.name} has been recorded.`,
        });
        form.reset();
        setIsOpen(false);
    } catch (error: any) {
      console.error("Failed to record payment:", error);
      toast({
        variant: "destructive",
        title: "Failed to Record Payment",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment for {tenant.name}</DialogTitle>
          <DialogDescription>
            {prefilledAmount 
                ? `${terminology.tenant.singular} claims to have paid ${formatCurrency(prefilledAmount)}. Current balance is ${formatCurrency(balance)}.`
                : `The current balance is ${formatCurrency(balance)}.`
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Amount to Record</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                {showDiscrepancyReason && (
                    <div className="space-y-4">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Amount Mismatch</AlertTitle>
                            <AlertDescription>
                                You are recording an amount less than the {terminology.tenant.singular.toLowerCase()} claimed. Please provide a reason.
                            </AlertDescription>
                        </Alert>
                         <FormField
                            control={form.control}
                            name="discrepancyReason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason for Discrepancy</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Bank transfer fee deducted, partial payment received..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}


                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : 'Record Payment'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
}
