export type CacheTag = string;

export function orgCompaniesListTag(orgId: string): CacheTag {
  return `crm:org:${orgId}:companies`;
}

export function orgBrandsListTag(orgId: string): CacheTag {
  return `crm:org:${orgId}:brands`;
}

export function orgContactsListTag(orgId: string): CacheTag {
  return `crm:org:${orgId}:contacts`;
}

export function orgEventsListTag(orgId: string): CacheTag {
  return `crm:org:${orgId}:events`;
}

export function orgParticipationsListTag(orgId: string): CacheTag {
  return `crm:org:${orgId}:participations`;
}

export function orgSmmListTag(orgId: string): CacheTag {
  return `crm:org:${orgId}:smm`;
}

export function orgDashboardTag(orgId: string): CacheTag {
  return `crm:org:${orgId}:dashboard`;
}

export function orgActionsListTag(orgId: string): CacheTag {
  return `crm:org:${orgId}:actions`;
}

export function orgNotesListTag(orgId: string): CacheTag {
  return `crm:org:${orgId}:notes`;
}

export function orgActionTemplatesListTag(orgId: string): CacheTag {
  return `crm:org:${orgId}:action-templates`;
}

export function orgProfilesListTag(orgId: string): CacheTag {
  return `crm:org:${orgId}:profiles`;
}

export function eventDetailTag(eventId: string): CacheTag {
  return `crm:event:${eventId}:detail`;
}

export function companyDetailTag(companyId: string): CacheTag {
  return `crm:company:${companyId}:detail`;
}

export function brandDetailTag(brandId: string): CacheTag {
  return `crm:brand:${brandId}:detail`;
}

export function contactDetailTag(contactId: string): CacheTag {
  return `crm:contact:${contactId}:detail`;
}

export function participationDetailTag(participationId: string): CacheTag {
  return `crm:participation:${participationId}:detail`;
}

export function profileTag(userId: string): CacheTag {
  return `crm:profile:${userId}`;
}

/** Scoped cache tags for org/event/entity isolation. */
export const cacheTags = {
  orgCompanies: orgCompaniesListTag,
  orgBrands: orgBrandsListTag,
  orgContacts: orgContactsListTag,
  orgEvents: orgEventsListTag,
  orgParticipations: orgParticipationsListTag,
  orgSmm: orgSmmListTag,
  orgDashboard: orgDashboardTag,
  orgActions: orgActionsListTag,
  orgNotes: orgNotesListTag,
  orgActionTemplates: orgActionTemplatesListTag,
  orgProfiles: orgProfilesListTag,
  eventDetail: eventDetailTag,
  companyDetail: companyDetailTag,
  brandDetail: brandDetailTag,
  contactDetail: contactDetailTag,
  participationDetail: participationDetailTag,
  profile: profileTag,
} as const;
