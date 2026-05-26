import "server-only";

import {
  brandDetailTag,
  companyDetailTag,
  contactDetailTag,
  eventDetailTag,
  orgActionsListTag,
  orgBrandsListTag,
  orgCompaniesListTag,
  orgContactsListTag,
  orgDashboardTag,
  orgEventsListTag,
  orgNotesListTag,
  orgParticipationsListTag,
  orgSmmListTag,
  participationDetailTag,
} from "@/lib/cache/tags";
import { invalidateCacheTags } from "@/lib/server-cache";

type RelatedIds = {
  eventIds?: string[];
  companyIds?: string[];
  brandIds?: string[];
  contactIds?: string[];
  participationIds?: string[];
};

function uniqueIds(ids: Array<string | null | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export function invalidateCompany(orgId: string, companyId: string, related: RelatedIds = {}) {
  const eventIds = uniqueIds(related.eventIds ?? []);

  invalidateCacheTags([
    orgCompaniesListTag(orgId),
    companyDetailTag(companyId),
    orgParticipationsListTag(orgId),
    orgSmmListTag(orgId),
    orgContactsListTag(orgId),
    orgDashboardTag(orgId),
    ...eventIds.map(eventDetailTag),
  ]);
}

export function invalidateBrand(orgId: string, brandId: string, related: RelatedIds = {}) {
  const companyIds = uniqueIds(related.companyIds ?? []);
  const eventIds = uniqueIds(related.eventIds ?? []);

  invalidateCacheTags([
    orgBrandsListTag(orgId),
    brandDetailTag(brandId),
    orgCompaniesListTag(orgId),
    orgParticipationsListTag(orgId),
    orgSmmListTag(orgId),
    ...companyIds.map(companyDetailTag),
    ...eventIds.map(eventDetailTag),
  ]);
}

export function invalidateContact(orgId: string, contactId: string, related: RelatedIds = {}) {
  const companyIds = uniqueIds(related.companyIds ?? []);
  const participationIds = uniqueIds(related.participationIds ?? []);

  invalidateCacheTags([
    orgContactsListTag(orgId),
    contactDetailTag(contactId),
    orgCompaniesListTag(orgId),
    orgParticipationsListTag(orgId),
    orgDashboardTag(orgId),
    ...companyIds.map(companyDetailTag),
    ...participationIds.map(participationDetailTag),
  ]);
}

export function invalidateEvent(orgId: string, eventId: string) {
  invalidateCacheTags([
    orgEventsListTag(orgId),
    eventDetailTag(eventId),
    orgParticipationsListTag(orgId),
    orgSmmListTag(orgId),
    orgActionsListTag(orgId),
    orgDashboardTag(orgId),
  ]);
}

export function invalidateParticipation(
  orgId: string,
  eventId: string | null | undefined,
  participationId: string,
  companyId?: string | null,
) {
  const tags = [
    orgParticipationsListTag(orgId),
    participationDetailTag(participationId),
    orgSmmListTag(orgId),
    orgDashboardTag(orgId),
    orgBrandsListTag(orgId),
  ];

  if (eventId) {
    tags.push(eventDetailTag(eventId));
    tags.push(orgEventsListTag(orgId));
  }

  if (companyId) {
    tags.push(companyDetailTag(companyId));
    tags.push(orgCompaniesListTag(orgId));
  }

  invalidateCacheTags(tags);
}

export function invalidateActions(orgId: string, related: RelatedIds = {}) {
  const companyIds = uniqueIds(related.companyIds ?? []);
  const participationIds = uniqueIds(related.participationIds ?? []);
  const eventIds = uniqueIds(related.eventIds ?? []);
  const contactIds = uniqueIds(related.contactIds ?? []);

  invalidateCacheTags([
    orgActionsListTag(orgId),
    orgDashboardTag(orgId),
    ...companyIds.map(companyDetailTag),
    ...participationIds.map(participationDetailTag),
    ...eventIds.map(eventDetailTag),
    ...contactIds.map(contactDetailTag),
  ]);
}

export function invalidateCompanyLogo(
  orgId: string,
  companyId: string,
  related: Pick<RelatedIds, "eventIds"> = {},
) {
  invalidateCompany(orgId, companyId, related);
}

export function invalidateBrandLogo(orgId: string, brandId: string, related: RelatedIds = {}) {
  invalidateBrand(orgId, brandId, related);
}

export function invalidateParticipationLogo(
  orgId: string,
  eventId: string,
  participationId: string,
  companyId?: string | null,
) {
  invalidateParticipation(orgId, eventId, participationId, companyId);
}

export function invalidateParticipationMaterial(
  orgId: string,
  eventId: string,
  participationId: string,
  companyId?: string | null,
) {
  invalidateParticipation(orgId, eventId, participationId, companyId);
}

export function invalidateNotes(orgId: string, companyId?: string | null) {
  const tags = [orgNotesListTag(orgId)];
  if (companyId) {
    tags.push(companyDetailTag(companyId));
  }
  invalidateCacheTags(tags);
}
