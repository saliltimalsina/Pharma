export type RequisitionStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Completed';

export type RfqStatus =
  | 'Draft'
  | 'Sent'
  | 'Receiving Quotes'
  | 'Closed'
  | 'Awarded'
  | 'Cancelled';

export type PoStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sent'
  | 'Partially Received'
  | 'Completed'
  | 'Cancelled';

export type GrnStatus = 'Pending' | 'Inspection' | 'Accepted' | 'Rejected' | 'Completed';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type VendorCategory =
  | 'API Supplier'
  | 'Excipients'
  | 'Packaging'
  | 'Lab Equipment'
  | 'Logistics'
  | 'MRO';

export interface RequisitionItem {
  item: string;
  description: string;
  requiredQty: number;
  unit: string;
  currentStock: number;
  requiredDate: string;
  remarks?: string;
}

export interface Requisition {
  id: string;
  requestNo: string;
  department: string;
  requestedBy: string;
  requestDate: string;
  requiredDate: string;
  priority: Priority;
  purpose: string;
  notes?: string;
  status: RequisitionStatus;
  approvedBy?: string;
  items: RequisitionItem[];
}

export interface VendorDoc {
  name: string;
  status: 'Valid' | 'Expiring' | 'Expired' | 'Missing';
  expiry?: string;
}

export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  category: VendorCategory;
  phone: string;
  email: string;
  website?: string;
  address: string;
  country: string;
  status: 'Active' | 'On Hold' | 'Blacklisted' | 'Pending Approval';
  registrationNumber: string;
  vatNumber: string;
  businessType: string;
  establishedDate: string;
  primaryContact: string;
  paymentTerms: string;
  currency: string;
  bankAccount: string;
  creditLimit: number;
  outstandingBalance: number;
  documents: VendorDoc[];
}

export interface RfqQuote {
  vendorId: string;
  vendorName: string;
  price: number;
  deliveryDays: number;
  qualityRating: number;
  paymentTerms: string;
  score: number;
  submitted: boolean;
}

export interface Rfq {
  id: string;
  rfqNo: string;
  title: string;
  category: VendorCategory;
  createdDate: string;
  closingDate: string;
  currency: string;
  status: RfqStatus;
  invitedVendors: string[];
  items: RequisitionItem[];
  quotes: RfqQuote[];
  awardedVendor?: string;
}

export interface PoItem {
  product: string;
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discount: number;
  vat: number;
  receivedQty?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  expectedDelivery: string;
  currency: string;
  warehouse: string;
  department: string;
  amount: number;
  status: PoStatus;
  createdBy: string;
  items: PoItem[];
}

export interface GrnItem {
  product: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  batchNumber: string;
  expiryDate: string;
}

export interface Grn {
  id: string;
  grnNumber: string;
  poNumber: string;
  vendorName: string;
  warehouse: string;
  receivedDate: string;
  receivedBy: string;
  deliveryNote: string;
  status: GrnStatus;
  items: GrnItem[];
}
