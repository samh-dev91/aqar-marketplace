export interface ListingCard {
  id: string;
  slug: string;
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
  askingPrice: string;
  pricePerSqm?: string;
  priceIsHidden: boolean;
  images: string[];
  verificationTier: 'LISTED' | 'VERIFIED' | 'GOLD';
  isStale: boolean;
  lastSyncAt: string;
  aqarScore?: number;
  brokerDisplayName?: string;
  brokerTier?: string | null;
  firmNameAr: string;
  firmNameEn?: string;
  firmLogoUrl?: string;
  hasFinancing: boolean;
  monthlyFrom?: string;
  viewCount: number;
  favoriteCount: number;
  isActive: boolean;
  publishedAt: string;
}

export interface ListingDetail extends ListingCard {
  descriptionAr?: string;
  descriptionEn?: string;
  floor?: number;
  totalFloors?: number;
  parkingSpaces?: number;
  isFurnished?: boolean;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  videoUrl?: string;
  virtualTourUrl?: string;
  floorPlanUrl?: string;
  aqarScoreAt?: string;
  brokerResponseTime?: number;
  brokerDealCount?: number;
  downPaymentFrom?: string;
  installmentMonths?: number;
  inquiryCount: number;
  shareCount: number;
  financing?: {
    downPaymentMin: string;
    downPaymentMax?: string;
    installmentMonths: number;
    frequency: string;
    monthlyMin: string;
    monthlyMax?: string;
    developerName?: string;
    notes?: string;
  };
  priceHistory?: { price: string; changeType: string; recordedAt: string }[];
}

export interface SearchFilters {
  q?: string;
  city?: string;
  district?: string;
  propertyType?: string;
  transactionType?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  monthlyBudget?: number;
  maxDownPayment?: number;
  verificationTier?: string;
  minAqarScore?: number;
  hasFinancing?: boolean;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'score' | 'area_desc';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  listings: ListingCard[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  facets: {
    cities: { value: string; count: number }[];
    districts: { value: string; count: number }[];
    propertyTypes: { value: string; count: number }[];
    priceRange: { min: number; max: number };
  };
}
