export function mapProduct(product: any) {
    return {
      _id: product._id,

      code: product.code,

      name: product.name,

      category: product.categoryId,

      image: product.image,

      description: product.description,

      isActive: product.isActive,

      createdAt:
        product.createdAt instanceof Date
          ? product.createdAt.toISOString()
          : product.createdAt ?? null,

      updatedAt:
        product.updatedAt instanceof Date
          ? product.updatedAt.toISOString()
          : product.updatedAt ?? null,
    };
  }

  export function mapProductList(product: any) {
    return mapProduct(product);
  }