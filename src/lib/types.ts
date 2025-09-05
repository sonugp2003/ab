
import { Timestamp } from 'firebase/firestore';

export interface Owner {
  id: string;
  uid: string;
  name: string;
  email: string;
  mobileNumber: string;
  address: string;
  upiId: string;
}

export interface Tenant {
  id:string;
  name: string;
  email: string;
  room: string;
  rentAmount: number;
  extraExpenses?: number;
  amountPaid: number;
  debt: number; // New field to track outstanding debt
  status: 'paid' | 'unpaid' | 'partial';
  avatar: string;
  roomCode: string;
  isRegistered: boolean;
  createdAt: Timestamp;
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: Timestamp;
  recordedBy: 'owner' | 'tenant';
  createdAt: Timestamp;
}

export interface Message {
  id: string;
  tenantId: string; // Keep track of which tenant this message belongs to
  amount: number;
  tenantName: string;
  createdAt: Timestamp;
  status: 'unread' | 'verified' | 'rejected';
  rejectionReason?: string;
}

    
