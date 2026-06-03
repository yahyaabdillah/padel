// Re-export shim. Canonical component lives in club-engage; this keeps the
// alternate import path (src/components/shared/...) working for any surface
// that references it.
export { default } from "@/components/club-engage/PromoReferralInput";
export type { PromoReferralChange } from "@/components/club-engage/PromoReferralInput";
