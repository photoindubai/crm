import { AppShell } from "@/components/app-shell";
import { TableLoading } from "@/components/table-loading";

export default function CompaniesLoading() {
  return (
    <AppShell title="Companies">
      <TableLoading />
    </AppShell>
  );
}

