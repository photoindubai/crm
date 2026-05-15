import { AppShell } from "@/components/app-shell";
import { TableLoading } from "@/components/table-loading";

export default function TasksLoading() {
  return (
    <AppShell title="Tasks">
      <TableLoading />
    </AppShell>
  );
}

