
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import type { Tenant } from '@/lib/types';
import { useUseCase } from '@/context/use-case-context';

interface DeleteTenantDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    tenant: Tenant;
    ownerId: string;
}

// Helper function to delete all documents in a subcollection
async function deleteSubcollection(collectionPath: string) {
    const collectionRef = collection(db, collectionPath);
    const querySnapshot = await getDocs(collectionRef);
    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}


export function DeleteTenantDialog({ isOpen, setIsOpen, tenant, ownerId }: DeleteTenantDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { terminology } = useUseCase();

  const handleDelete = async () => {
    setLoading(true);
    try {
        const tenantPath = `${terminology.owner.collectionName}/${ownerId}/${terminology.tenant.collectionName}/${tenant.id}`;
        const tenantRef = doc(db, tenantPath);
        
        // Delete subcollections first
        await deleteSubcollection(`${tenantPath}/payments`);
        await deleteSubcollection(`${tenantPath}/messages`);
        
        // Delete the tenant document
        await deleteDoc(tenantRef);

        toast({
            title: `${terminology.tenant.singular} Deleted`,
            description: `${tenant.name} and all their data have been permanently removed.`,
        });
        setIsOpen(false);
    } catch (error: any) {
      console.error("Failed to delete tenant:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete <span className="font-bold">{tenant.name}</span> and all of their associated data, including payment history and messages.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <><Trash2 className="mr-2 h-4 w-4"/>Delete {terminology.tenant.singular}</>}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
