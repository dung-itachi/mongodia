export function mapArea(area: any) {
    return {
      _id: area._id,
      code: area.code,
      name: area.name,
      address: area.address,
      countryCode: area.countryCode,
      isActive: area.isActive,
    };
  }
  
  export function mapAreaList(area: any) {
    return mapArea(area);
  }