
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUseCase } from '@/context/use-case-context';

const formSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  email: z.string().email("Invalid email address"),
  room: z.string().min(1, "Room/Unit is required"),
  rentAmount: z.coerce.number().min(0, "Rent must be a positive number"),
  extraExpenses: z.coerce.number().min(0, "Expenses must be a positive number").optional(),
});

function generateRoomCode(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface AddTenantDialogProps {
    ownerId: string;
}

export function AddTenantDialog({ ownerId }: AddTenantDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { terminology } = useUseCase();
  const db = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      room: "",
      rentAmount: 0,
      extraExpenses: 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        const tenantRef = collection(db, `${terminology.owner.collectionName}/${ownerId}/${terminology.tenant.collectionName}`);
        await addDoc(tenantRef, {
            ...values,
            amountPaid: 0,
            status: 'unpaid',
            debt: 0, // Initialize debt to 0
            avatar: `https://robohash.org/${values.email}`,
            roomCode: generateRoomCode(6),
            isRegistered: false,
            createdAt: serverTimestamp(),
        });
        
        toast({
            title: `${terminology.tenant.singular} Added Successfully`,
            description: `${values.name} has been added to your list.`,
        });
        form.reset();
        setOpen(false);
    } catch (error: any) {
      console.error("Failed to add tenant:", error);
      toast({
        variant: "destructive",
        title: `Failed to Add ${terminology.tenant.singular}`,
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle /> Add New {terminology.tenant.singular}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New {terminology.tenant.singular}</DialogTitle>
          <DialogDescription>
            Enter the details of your new {terminology.tenant.singular.toLowerCase()}. An onboarding code will be generated for them.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="name"
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
                                <Input type="email" placeholder="tenant@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="room"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{terminology.room.singular}</FormLabel>
                            <FormControl>
                                <Input placeholder={terminology.room.placeholder} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="rentAmount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Base {terminology.rent.singular}</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="extraExpenses"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Extra Expenses</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <DialogFooter>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : `Save ${terminology.tenant.singular}`}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
