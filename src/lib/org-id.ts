/** Resolves the active organization id for list loaders and API routes. */
export function resolveOrganizationId(organizationId: string | null | undefined): string {
  const fromProfile = organizationId?.trim();
  if (fromProfile) {
    return fromProfile;
  }

  return process.env.DEFAULT_ORGANIZATION_ID?.trim() ?? "";
}
