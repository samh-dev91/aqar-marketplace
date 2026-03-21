import crypto from 'crypto';
import axios from 'axios';

const CRM_BASE_URL = process.env.CRM_BASE_URL || 'http://localhost:3001';
const MARKETPLACE_SECRET = process.env.MARKETPLACE_SECRET || '';

function generateSignature(body: string): string {
  return crypto
    .createHmac('sha256', MARKETPLACE_SECRET)
    .update(body)
    .digest('hex');
}

const crmApi = axios.create({ baseURL: `${CRM_BASE_URL}/api/marketplace-bridge` });

crmApi.interceptors.request.use((config) => {
  const body = config.data ? JSON.stringify(config.data) : '';
  config.headers['X-Marketplace-Signature'] = generateSignature(body);
  config.headers['Content-Type'] = 'application/json';
  return config;
});

export interface CrmListingData {
  id: string;
  firmId: string;
  firmSlug: string;
  firmNameAr: string;
  firmNameEn?: string;
  firmLogoUrl?: string;
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
  isExclusive: boolean;
  exclusiveUntil?: string;
  verificationData?: {
    hasTitleDeed: boolean;
    isEsigned: boolean;
    firmActiveMonths: number;
    brokerDealCount: number;
  };
  brokerDisplayName?: string;
  brokerResponseTime?: number;
}

export interface CrmInquiryPayload {
  crmFirmId: string;
  crmPropertyId: string;
  consumerName: string;
  consumerPhone: string;
  consumerEmail?: string;
  message?: string;
  budgetStated?: number;
  viewingDate?: string;
  source: 'MARKETPLACE';
}

export const crmBridgeApi = {
  async getListings(page = 1, limit = 100): Promise<{ data: CrmListingData[]; total: number; hasMore: boolean }> {
    const { data } = await crmApi.get('/listings', { params: { page, limit } });
    return data;
  },

  async getListing(propertyId: string): Promise<CrmListingData> {
    const { data } = await crmApi.get(`/listings/${propertyId}`);
    return data.data;
  },

  async getFirmProfiles(): Promise<unknown[]> {
    const { data } = await crmApi.get('/firm-profiles');
    return data.data;
  },

  async getDistrictStats(): Promise<unknown[]> {
    const { data } = await crmApi.get('/district-stats');
    return data.data;
  },

  async createInquiry(payload: CrmInquiryPayload): Promise<{ crmLeadId: string }> {
    const { data } = await crmApi.post('/inquiries', payload);
    return data.data;
  },
};

export default crmBridgeApi;
