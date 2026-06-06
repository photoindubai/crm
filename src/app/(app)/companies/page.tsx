import { PageHeader } from "@/components/page-header";
import { CompaniesLegacyView } from "@/app/(app)/companies/companies-legacy-view";
import { CompaniesPageClient } from "@/app/(app)/companies/companies-page-client";
import { requireActiveProfile } from "@/lib/auth";
import { loadCompaniesClientList, loadCompaniesPaginated } from "@/lib/loaders/companies-list";
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
  const orgId = profile.organization_id ?? "";

  const page = getPageParam(params);
  const query = getStringParam(params, "q")?.trim() ?? "";
  const mine = getStringParam(params, "mine") === "1";

  const orgUsers = await getOrgUsers(orgId);
  const clientList = await loadCompaniesClientList(orgId);

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
          orgId={orgId}
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

async function CompaniesLegacyContent({
  orgId,
  userId,
  page,
  query,
  mine,
  users,
  ineligibleMessage,
  total,
}: {
  orgId: string;
  userId: string;
  page: number;
  query: string;
  mine: boolean;
  users: Awaited<ReturnType<typeof getOrgUsers>>;
  ineligibleMessage?: string;
  total: number;
}) {
  const { companies, count } = await loadCompaniesPaginated(orgId, {
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
