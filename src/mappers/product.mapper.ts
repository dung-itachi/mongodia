export function mapProduct(product: any) {
    return {
      _id: product._id,
  
      code: product.code,
  
      name: product.name,
  
      category: product.categoryId,
  
      image: product.image,
  
      description: product.description,
  
      isActive: product.isActive,
    };
  }
  
  export function mapProductList(product: any) {
    return mapProduct(product);
  }