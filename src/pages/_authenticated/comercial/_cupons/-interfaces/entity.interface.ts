export interface ICupom {
  id: number;
  code: string;
  description?: string;
  sellerId?: number;
  seller?: {
    id: number;
    name: string;
    email?: string;
  };
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  commissionType?: 'percentage' | 'fixed';
  commissionValue?: number;
  minPurchaseValue?: number;
  maxDiscountValue?: number;
  usageLimit?: number;
  usageCount: number;
  usagePerCustomer: number;
  validUntil?: Date | string;
  firstPurchaseOnly: boolean;
  classId?: number;
  class?: {
    id: number;
    name: string;
  };
  courseId?: number;
  course?: {
    id: number;
    name: string;
  };
  active: boolean;
  companyId?: number;
  inactiveAt?: Date | string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    financialRecords: number;
  };
}

export type DiscountType = 'percentage' | 'fixed';
export type CommissionType = 'percentage' | 'fixed';

export interface ICupomFormData {
  code: string;
  description?: string;
  sellerId?: number;
  discountType: DiscountType;
  discountValue: number;
  commissionType?: CommissionType;
  commissionValue?: number;
  minPurchaseValue?: number;
  maxDiscountValue?: number;
  usageLimit?: number;
  usageCount: number;
  usagePerCustomer: number;
  validUntil?: Date | string;
  firstPurchaseOnly: boolean;
  classId?: number;
  courseId?: number;
  active: boolean;
}