import { NextResponse } from "next/server";
import { requireRouteAuth } from "@/lib/api/route-auth";
import { loadCompaniesClientList } from "@/lib/loaders/companies-list";

export async function GET() {
  const auth = await requireRouteAuth();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const result = await loadCompaniesClientList(auth.organizationId).catch((error) => {
    console.error("GET /api/crm/companies failed", error);
    return {
      companies: [],
      total: 0,
      clientCacheEligible: false,
      message: "Failed to load companies.",
    };
  });
  return NextResponse.json(result);
}
