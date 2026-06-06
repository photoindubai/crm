"use client";

import { useMemo, useState } from "react";
import { COMPANIES_PAGE_SIZE } from "@/lib/loaders/companies-list.types";
import type { CompaniesClientListResult } from "@/lib/loaders/companies-list.types";
import type { OrgUser } from "@/lib/ownership";
import { CompaniesMineToggle } from "@/app/(app)/companies/companies-mine-toggle";
import { CompaniesSearch } from "@/app/(app)/companies/companies-search";
import { CompaniesTable } from "@/app/(app)/companies/companies-table";
import { useCompaniesQuery } from "@/app/(app)/companies/use-companies-query";

function filterCompanies(
  companies: CompaniesClientListResult["companies"],
  search: string,
  mine: boolean,
  userId: string,
) {
  let result = companies;

  if (mine) {
    result = result.filter((company) => company.owner_id === userId);
  }

  const trimmed = search.trim();
  if (trimmed) {
    const query = trimmed.toLowerCase();
    result = result.filter((company) => company.company_name.toLowerCase().includes(query));
  }

  return result;
}

export function CompaniesPageClient({
  orgId,
  userId,
  users,
  initialData,
  initialSearch,
  initialMine,
}: {
  orgId: string;
  userId: string;
  users: OrgUser[];
  initialData: CompaniesClientListResult;
  initialSearch: string;
  initialMine: boolean;
}) {
  const { data } = useCompaniesQuery(orgId, initialData);
  const [search, setSearch] = useState(initialSearch);
  const [mine, setMine] = useState(initialMine);
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => filterCompanies(data.companies, search, mine, userId),
    [data.companies, search, mine, userId],
  );

  const totalPages = Math.max(Math.ceil(filtered.length / COMPANIES_PAGE_SIZE), 1);
  const currentPage = Math.min(page, totalPages);
  const pageCompanies = filtered.slice(
    (currentPage - 1) * COMPANIES_PAGE_SIZE,
    currentPage * COMPANIES_PAGE_SIZE,
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleMineChange(nextMine: boolean) {
    setMine(nextMine);
    setPage(1);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CompaniesSearch
          value={search}
          onChange={handleSearchChange}
          onReset={() => handleSearchChange("")}
        />
        <CompaniesMineToggle active={mine} onChange={handleMineChange} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
        <CompaniesTable
          companies={pageCompanies}
          users={users}
          currentUserId={userId}
          orgId={orgId}
        />
        <div className="flex items-center justify-between border-t border-border bg-white px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages} · {filtered.length} records
          </span>
          <div className="flex gap-2">
            <PaginationButton
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(value - 1, 1))}
            >
              Previous
            </PaginationButton>
            <PaginationButton
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(value + 1, totalPages))}
            >
              Next
            </PaginationButton>
          </div>
        </div>
      </div>
    </>
  );
}

function PaginationButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border border-border px-3 py-1.5 text-muted-foreground opacity-50">
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
    >
      {children}
    </button>
  );
}
