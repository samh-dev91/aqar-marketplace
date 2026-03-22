
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.ListingScalarFieldEnum = {
  id: 'id',
  crmFirmId: 'crmFirmId',
  crmPropertyId: 'crmPropertyId',
  slug: 'slug',
  crmFirmSlug: 'crmFirmSlug',
  projectId: 'projectId',
  titleAr: 'titleAr',
  titleEn: 'titleEn',
  descriptionAr: 'descriptionAr',
  descriptionEn: 'descriptionEn',
  propertyType: 'propertyType',
  transactionType: 'transactionType',
  address: 'address',
  district: 'district',
  city: 'city',
  latitude: 'latitude',
  longitude: 'longitude',
  googleMapsUrl: 'googleMapsUrl',
  area: 'area',
  bedrooms: 'bedrooms',
  bathrooms: 'bathrooms',
  floor: 'floor',
  totalFloors: 'totalFloors',
  parkingSpaces: 'parkingSpaces',
  isFurnished: 'isFurnished',
  askingPrice: 'askingPrice',
  pricePerSqm: 'pricePerSqm',
  priceIsHidden: 'priceIsHidden',
  images: 'images',
  videoUrl: 'videoUrl',
  virtualTourUrl: 'virtualTourUrl',
  floorPlanUrl: 'floorPlanUrl',
  verificationTier: 'verificationTier',
  isStale: 'isStale',
  staleSince: 'staleSince',
  lastSyncAt: 'lastSyncAt',
  aqarScore: 'aqarScore',
  aqarScoreAt: 'aqarScoreAt',
  brokerDisplayName: 'brokerDisplayName',
  brokerResponseTime: 'brokerResponseTime',
  brokerDealCount: 'brokerDealCount',
  brokerSuccessRate: 'brokerSuccessRate',
  brokerVerifiedSince: 'brokerVerifiedSince',
  brokerTier: 'brokerTier',
  firmNameAr: 'firmNameAr',
  firmNameEn: 'firmNameEn',
  firmLogoUrl: 'firmLogoUrl',
  hasFinancing: 'hasFinancing',
  monthlyFrom: 'monthlyFrom',
  downPaymentFrom: 'downPaymentFrom',
  installmentMonths: 'installmentMonths',
  viewCount: 'viewCount',
  inquiryCount: 'inquiryCount',
  favoriteCount: 'favoriteCount',
  shareCount: 'shareCount',
  isActive: 'isActive',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ListingFinancingScalarFieldEnum = {
  id: 'id',
  listingId: 'listingId',
  downPaymentMin: 'downPaymentMin',
  downPaymentMax: 'downPaymentMax',
  installmentMonths: 'installmentMonths',
  frequency: 'frequency',
  monthlyMin: 'monthlyMin',
  monthlyMax: 'monthlyMax',
  developerName: 'developerName',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PriceHistoryScalarFieldEnum = {
  id: 'id',
  listingId: 'listingId',
  price: 'price',
  changeType: 'changeType',
  recordedAt: 'recordedAt'
};

exports.Prisma.ConsumerScalarFieldEnum = {
  id: 'id',
  phone: 'phone',
  phoneHash: 'phoneHash',
  email: 'email',
  nameAr: 'nameAr',
  nameEn: 'nameEn',
  avatarUrl: 'avatarUrl',
  preferredCity: 'preferredCity',
  preferredDistricts: 'preferredDistricts',
  budgetMin: 'budgetMin',
  budgetMax: 'budgetMax',
  monthlyBudget: 'monthlyBudget',
  preferredTypes: 'preferredTypes',
  searchPreferences: 'searchPreferences',
  googleId: 'googleId',
  appleId: 'appleId',
  pushSubscriptions: 'pushSubscriptions',
  lastActiveAt: 'lastActiveAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConsumerSessionScalarFieldEnum = {
  id: 'id',
  consumerId: 'consumerId',
  token: 'token',
  provider: 'provider',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.InquiryScalarFieldEnum = {
  id: 'id',
  listingId: 'listingId',
  consumerId: 'consumerId',
  crmFirmId: 'crmFirmId',
  crmPropertyId: 'crmPropertyId',
  consumerName: 'consumerName',
  consumerPhone: 'consumerPhone',
  consumerPhoneHash: 'consumerPhoneHash',
  consumerEmail: 'consumerEmail',
  message: 'message',
  budgetStated: 'budgetStated',
  preferredViewing: 'preferredViewing',
  status: 'status',
  crmLeadId: 'crmLeadId',
  optInMethod: 'optInMethod',
  whatsappSentAt: 'whatsappSentAt',
  brokerNotifiedAt: 'brokerNotifiedAt',
  consumerOptedInAt: 'consumerOptedInAt',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.FavoriteScalarFieldEnum = {
  id: 'id',
  consumerId: 'consumerId',
  listingId: 'listingId',
  createdAt: 'createdAt'
};

exports.Prisma.PriceAlertScalarFieldEnum = {
  id: 'id',
  consumerId: 'consumerId',
  listingId: 'listingId',
  savedSearchId: 'savedSearchId',
  alertType: 'alertType',
  priceThreshold: 'priceThreshold',
  dropPercent: 'dropPercent',
  isActive: 'isActive',
  lastTriggeredAt: 'lastTriggeredAt',
  triggerCount: 'triggerCount',
  createdAt: 'createdAt'
};

exports.Prisma.SavedSearchScalarFieldEnum = {
  id: 'id',
  consumerId: 'consumerId',
  nameAr: 'nameAr',
  filters: 'filters',
  lastRunAt: 'lastRunAt',
  resultCount: 'resultCount',
  createdAt: 'createdAt'
};

exports.Prisma.ComparisonScalarFieldEnum = {
  id: 'id',
  consumerId: 'consumerId',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ComparisonItemScalarFieldEnum = {
  id: 'id',
  comparisonId: 'comparisonId',
  listingId: 'listingId',
  addedAt: 'addedAt',
  position: 'position'
};

exports.Prisma.ViewHistoryScalarFieldEnum = {
  id: 'id',
  consumerId: 'consumerId',
  listingId: 'listingId',
  viewedAt: 'viewedAt'
};

exports.Prisma.DistrictStatsScalarFieldEnum = {
  id: 'id',
  city: 'city',
  district: 'district',
  propertyType: 'propertyType',
  transactionType: 'transactionType',
  avgPricePerSqm: 'avgPricePerSqm',
  medianPrice: 'medianPrice',
  avgDaysOnMarket: 'avgDaysOnMarket',
  dealVelocity: 'dealVelocity',
  priceChange6m: 'priceChange6m',
  priceChange12m: 'priceChange12m',
  listingCount: 'listingCount',
  soldCount30d: 'soldCount30d',
  computedAt: 'computedAt'
};

exports.Prisma.MarketReportScalarFieldEnum = {
  id: 'id',
  titleAr: 'titleAr',
  titleEn: 'titleEn',
  period: 'period',
  periodType: 'periodType',
  city: 'city',
  bodyAr: 'bodyAr',
  bodyEn: 'bodyEn',
  pdfUrl: 'pdfUrl',
  coverImageUrl: 'coverImageUrl',
  isPublished: 'isPublished',
  publishedAt: 'publishedAt',
  viewCount: 'viewCount',
  createdAt: 'createdAt'
};

exports.Prisma.SyncLogScalarFieldEnum = {
  id: 'id',
  eventType: 'eventType',
  crmFirmId: 'crmFirmId',
  crmPropertyId: 'crmPropertyId',
  listingSlug: 'listingSlug',
  payload: 'payload',
  status: 'status',
  errorMessage: 'errorMessage',
  processedAt: 'processedAt',
  createdAt: 'createdAt'
};

exports.Prisma.BrokerReviewScalarFieldEnum = {
  id: 'id',
  consumerId: 'consumerId',
  crmFirmSlug: 'crmFirmSlug',
  rating: 'rating',
  commentAr: 'commentAr',
  isVerified: 'isVerified',
  createdAt: 'createdAt'
};

exports.Prisma.OtpCodeScalarFieldEnum = {
  id: 'id',
  phone: 'phone',
  code: 'code',
  attempts: 'attempts',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.ProjectScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  nameAr: 'nameAr',
  nameEn: 'nameEn',
  developerNameAr: 'developerNameAr',
  developerNameEn: 'developerNameEn',
  coverImageUrl: 'coverImageUrl',
  galleryImages: 'galleryImages',
  videoUrl: 'videoUrl',
  virtualTourUrl: 'virtualTourUrl',
  district: 'district',
  city: 'city',
  latitude: 'latitude',
  longitude: 'longitude',
  deliveryYear: 'deliveryYear',
  totalUnits: 'totalUnits',
  availableUnits: 'availableUnits',
  minPrice: 'minPrice',
  maxPrice: 'maxPrice',
  hasFinancing: 'hasFinancing',
  minDownPayment: 'minDownPayment',
  maxYears: 'maxYears',
  amenities: 'amenities',
  descriptionAr: 'descriptionAr',
  descriptionEn: 'descriptionEn',
  isActive: 'isActive',
  publishedAt: 'publishedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  Listing: 'Listing',
  ListingFinancing: 'ListingFinancing',
  PriceHistory: 'PriceHistory',
  Consumer: 'Consumer',
  ConsumerSession: 'ConsumerSession',
  Inquiry: 'Inquiry',
  Favorite: 'Favorite',
  PriceAlert: 'PriceAlert',
  SavedSearch: 'SavedSearch',
  Comparison: 'Comparison',
  ComparisonItem: 'ComparisonItem',
  ViewHistory: 'ViewHistory',
  DistrictStats: 'DistrictStats',
  MarketReport: 'MarketReport',
  SyncLog: 'SyncLog',
  BrokerReview: 'BrokerReview',
  OtpCode: 'OtpCode',
  Project: 'Project'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
