/**
 * Gift Mapper (Sprint 8.x - Gift Management)
 *
 * Convert Mongoose Gift document -> Plain object for API response.
 * Theo convention của project (Category, Product, ...).
 */

export function mapGift(gift: any) {
  if (!gift) return null;
  return {
    _id: gift._id,
    name: gift.name,
    stockQuantity: gift.stockQuantity,
    isActive: gift.isActive,
    createdAt: gift.createdAt,
    updatedAt: gift.updatedAt,
  };
}

export function mapGiftList(gift: any) {
  return mapGift(gift);
}
