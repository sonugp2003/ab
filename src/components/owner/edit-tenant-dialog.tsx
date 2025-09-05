
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
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import type { Tenant } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useUseCase } from '@/context/use-case-context';

const formSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  email: z.string().email("Invalid email address"),
  room: z.string().min(1, "Room/Unit is required"),
  rentAmount: z.coerce.number().min(0, "Rent must be a positive number"),
  extraExpenses: z.coerce.number().min(0, "Expenses must be a positive number").optional(),
  createdAt: z.date({
    required_error: "A registration date is required.",
  }),
});

interface EditTenantDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    tenant: Tenant;
    ownerId: string;
}

export function EditTenantDialog({ isOpen, setIsOpen, tenant, ownerId }: EditTenantDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { terminology } = useUseCase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tenant.name,
      email: tenant.email,
      room: tenant.room,
      rentAmount: tenant.rentAmount,
      extraExpenses: tenant.extraExpenses || 0,
      createdAt: tenant.createdAt?.toDate(),
    },
  });

  useEffect(() => {
      if(tenant) {
          form.reset({
             name: tenant.name,
            email: tenant.email,
            room: tenant.room,
            rentAmount: tenant.rentAmount,
            extraExpenses: tenant.extraExpenses || 0,
            createdAt: tenant.createdAt?.toDate(),
          })
      }
  }, [tenant, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        const tenantRef = doc(db, `${terminology.owner.collectionName}/${ownerId}/${terminology.tenant.collectionName}/${tenant.id}`);
        const dataToUpdate = {
            ...values,
            createdAt: Timestamp.fromDate(values.createdAt),
        };
        await updateDoc(tenantRef, dataToUpdate);
        
        toast({
            title: `${terminology.tenant.singular} Updated Successfully`,
            description: `${values.name}'s details have been updated.`,
        });
        setIsOpen(false);
    } catch (error: any) {
      console.error("Failed to update tenant:", error);
      toast({
        variant: "destructive",
        title: `Failed to Update ${terminology.tenant.singular}`,
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {terminology.tenant.singular} Details</DialogTitle>
          <DialogDescription>
            Update the information for {tenant.name}. The {terminology.roomCode.singular} cannot be changed.
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
                 <FormField
                  control={form.control}
                  name="createdAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Registration Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
