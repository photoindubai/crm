import { PageHeader } from "@/components/page-header";
import { CompaniesLegacyView } from "@/app/(app)/companies/companies-legacy-view";
import { CompaniesPageClient } from "@/app/(app)/companies/companies-page-client";
import { requireActiveProfile } from "@/lib/auth";
import { CLIENT_CACHE_INELIGIBLE_MESSAGE } from "@/lib/query/limits";
import { loadCompaniesClientList, loadCompaniesPaginated } from "@/lib/loaders/companies-list";
import type { CompaniesClientListResult } from "@/lib/loaders/companies-list.types";
import { resolveOrganizationId } from "@/lib/org-id";
import { getOrgUsers } from "@/lib/ownership.server";
import { getPageParam, getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";

export const revalidate = 3600;

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const { profile } = await requireActiveProfile();
  const orgId = resolveOrganizationId(profile.organization_id);

  const page = getPageParam(params);
  const query = getStringParam(params, "q")?.trim() ?? "";
  const mine = getStringParam(params, "mine") === "1";

  const orgUsers = await getOrgUsers(orgId);
  const clientList = await loadCompaniesClientListSafe(profile.organization_id);

  return (
    <>
      <PageHeader title="Companies" />
      {clientList.clientCacheEligible ? (
        <CompaniesPageClient
          orgId={orgId}
          userId={profile.id}
          users={orgUsers}
          initialData={clientList}
          initialSearch={query}
          initialMine={mine}
        />
      ) : (
        <CompaniesLegacyContent
          organizationId={profile.organization_id}
          userId={profile.id}
          page={page}
          query={query}
          mine={mine}
          users={orgUsers}
          ineligibleMessage={clientList.message}
          total={clientList.total}
        />
      )}
    </>
  );
}

async function loadCompaniesClientListSafe(
  organizationId: string | null | undefined,
): Promise<CompaniesClientListResult> {
  try {
    return await loadCompaniesClientList(organizationId);
  } catch (error) {
    console.error("Failed to load companies client list", error);
    return {
      companies: [],
      total: 0,
      clientCacheEligible: false,
      message: CLIENT_CACHE_INELIGIBLE_MESSAGE,
    };
  }
}

async function CompaniesLegacyContent({
  organizationId,
  userId,
  page,
  query,
  mine,
  users,
  ineligibleMessage,
  total,
}: {
  organizationId: string | null | undefined;
  userId: string;
  page: number;
  query: string;
  mine: boolean;
  users: Awaited<ReturnType<typeof getOrgUsers>>;
  ineligibleMessage?: string;
  total: number;
}) {
  const { companies, count } = await loadCompaniesPaginated(organizationId, {
    page,
    query,
    mine,
    userId,
  });

  return (
    <CompaniesLegacyView
      companies={companies}
      count={count}
      query={query}
      mine={mine}
      page={page}
      users={users}
      currentUserId={userId}
      ineligibleMessage={ineligibleMessage}
      total={total}
    />
  );
}
