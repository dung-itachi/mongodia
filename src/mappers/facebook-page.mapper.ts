export function mapFacebookPage(facebookPage: any) {
  return {
    _id: facebookPage._id,
    code: facebookPage.code,
    name: facebookPage.name,
    pageUrl: facebookPage.pageUrl,
    facebookPageId: facebookPage.facebookPageId,
    description: facebookPage.description,
    isActive: facebookPage.isActive,
    createdAt: facebookPage.createdAt,
    updatedAt: facebookPage.updatedAt,
  };
}

export function mapFacebookPageList(facebookPage: any) {
  return mapFacebookPage(facebookPage);
}
