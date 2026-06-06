import { PageHeader } from "@/components/page-header";
import { TableLoading } from "@/components/table-loading";

export default function Loading() {
  return (
    <>
      <PageHeader title="Contact Detail" />
      <TableLoading rows={5} />
    </>
  );
}
