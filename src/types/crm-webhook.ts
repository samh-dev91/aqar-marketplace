export type WebhookEventType =
  | 'LISTING_PUBLISHED'
  | 'LISTING_UPDATED'
  | 'LISTING_REMOVED'
  | 'STATUS_CHANGED';

export interface CrmWebhookPayload {
  event: WebhookEventType;
  firmId: string;
  firmSlug: string;
  propertyId: string;
  timestamp: string;
  data: {
    titleAr: string;
    titleEn?: string;
    propertyType: string;
    transactionType: string;
    address: string;
    district?: string;
    city: string;
    area?: number;
    bedrooms?: number;
    bathrooms?: number;
    floor?: number;
    totalFloors?: number;
    parkingSpaces?: number;
    isFurnished?: boolean;
    askingPrice: string;
    pricePerSqm?: string;
    images: string[];
    videoUrl?: string;
    status?: string;
    isExclusive?: boolean;
    exclusiveUntil?: string;
    firmNameAr: string;
    firmNameEn?: string;
    firmLogoUrl?: string;
    brokerDisplayName?: string;
    brokerResponseTime?: number;
    brokerDealCount?: number;
    verificationTier?: 'LISTED' | 'VERIFIED' | 'GOLD';
    hasFinancing?: boolean;
    monthlyFrom?: string;
    downPaymentFrom?: string;
    installmentMonths?: number;
    latitude?: number;
    longitude?: number;
  };
}
