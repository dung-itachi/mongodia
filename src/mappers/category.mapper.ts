export function mapCategory(category: any) {
    return {
      _id: category._id,
  
      code: category.code,
  
      name: category.name,
  
      description: category.description,
  
      sortOrder: category.sortOrder,
  
      parent: category.parentId,
  
      isActive: category.isActive,
    };
  }
  
  export function mapCategoryList(category: any) {
    return mapCategory(category);
  }