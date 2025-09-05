
"use client";

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { useUseCase } from '@/context/use-case-context';

const formSchema = z.object({
  rejectionReason: z.string().min(10, "Reason must be at least 10 characters"),
});

interface RejectPaymentDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    message: Message;
    ownerId: string;
}

export function RejectPaymentDialog({ isOpen, setIsOpen, message, ownerId }: RejectPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { terminology } = useUseCase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rejectionReason: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        const messageRef = doc(db, `${terminology.owner.collectionName}/${ownerId}/${terminology.tenant.collectionName}/${message.tenantId}/messages/${message.id}`);
        await updateDoc(messageRef, {
            status: 'rejected',
            rejectionReason: values.rejectionReason,
        });

        toast({
            title: "Notification Rejected",
            description: `The payment notification from ${message.tenantName} has been rejected.`,
        });
        form.reset();
        setIsOpen(false);
    } catch (error: any) {
      console.error("Failed to reject notification:", error);
      toast({
        variant: "destructive",
        title: "Failed to Reject",
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
          <DialogTitle>Reject Payment Notification</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting the payment claim of {message.amount} from {message.tenantName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <FormField
                    control={form.control}
                    name="rejectionReason"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Reason for Rejection</FormLabel>
                            <FormControl>
                                <Textarea placeholder="e.g., Amount not received, incorrect details..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" variant="destructive" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : 'Reject Notification'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
