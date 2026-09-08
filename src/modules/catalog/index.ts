// ─────────────────────────────────────────────────────────────
// Catalog Module — Public API (Barrel Export)
// ─────────────────────────────────────────────────────────────
// Only the service, routes, and public types/enums are exposed.
// Models and Repository are intentionally hidden — other modules
// MUST NOT import them directly.
// ─────────────────────────────────────────────────────────────

// Service — primary public interface
export { CatalogService, sanitizeForLtree, type ProductResponse } from './catalog.service';

// Routes — Express REST API
export { catalogRoutes } from './catalog.routes';

// Guard & Request types
export { catalogTenantGuard, type CatalogRequest } from './catalog.tenant-guard';

// Enums & Public Types
export {
  EcommerceStatus,
  ProductStatus,
  VariantStatus,
  CouponDiscountType,
  CouponTargetType,
  UserBehaviorRuleType,
} from './models';
export type {
  CreateEcommerceInput,
  UpdateEcommerceInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateProductInput,
  UpdateProductInput,
  CreateProductOptionInput,
  UpdateProductOptionInput,
  CreateProductOptionValueInput,
  UpdateProductOptionValueInput,
  CreateProductVariantInput,
  UpdateProductVariantInput,
  UnitQueryInput,
  CreateBannerInput,
  UpdateBannerInput,
  CreateCouponInput,
  UpdateCouponInput,
  ValidateCouponInput,
  CouponQueryInput,
} from './catalog.validator';
export { unitQuerySchema } from './catalog.validator';
export type { CouponEvaluationResult } from './catalog.service';
export type { CustomerSummary, CreateOrderInput, OrderRecord } from './catalog.repository';
