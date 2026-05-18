type FileProvider = "cloudflare_r2" | "external" | "supabase_storage" | "aws_s3" | (string & {});

type FileLike = {
  provider?: FileProvider | null;
  file_role?: string | null;
  is_public?: boolean | null;
  storage_path?: string | null;
  public_url?: string | null;
  external_url?: string | null;
};

type CompanyLike = {
  company_logo_url?: string | null;
  primary_logo_file?: FileLike | null;
};

type BrandLike = {
  brand_logo_url?: string | null;
  primary_logo_file?: FileLike | null;
};

type ParticipationLike = {
  public_logo_file?: FileLike | null;
};

type LogoSetLike = {
  full?: FileLike | null;
  thumb?: FileLike | null;
  full_inverted?: FileLike | null;
  thumb_inverted?: FileLike | null;
  primary?: FileLike | null;
};

function getPublicBaseUrl() {
  const value = process.env.R2_PUBLIC_BASE_URL ?? "";
  const normalized = value.trim().replace(/\/+$/, "");
  return normalized || null;
}

function normalizeStoragePath(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().replace(/^\/+/, "");
  return normalized || null;
}

export function getFilePublicUrl(file: FileLike | null | undefined) {
  if (!file) {
    return null;
  }

  const provider = file.provider ?? null;

  if (provider === "cloudflare_r2") {
    if (!file.is_public) {
      return null;
    }
    if (file.public_url) {
      return file.public_url;
    }
    const storagePath = normalizeStoragePath(file.storage_path);
    const baseUrl = getPublicBaseUrl();
    if (!storagePath || !baseUrl) {
      return null;
    }
    return `${baseUrl}/${storagePath}`;
  }

  if (provider === "external") {
    return file.public_url ?? file.external_url ?? null;
  }

  if (provider === "supabase_storage" || provider === "aws_s3") {
    return file.public_url ?? null;
  }

  return file.public_url ?? file.external_url ?? null;
}

export function resolveCompanyLogo(company: CompanyLike | null | undefined, primaryLogoFile?: FileLike | null) {
  if (!company) {
    return null;
  }

  return (
    getFilePublicUrl(company.primary_logo_file) ??
    getFilePublicUrl(primaryLogoFile) ??
    company.company_logo_url ??
    null
  );
}

export function resolveBrandLogo(brand: BrandLike | null | undefined, primaryLogoFile?: FileLike | null) {
  if (!brand) {
    return null;
  }

  return (
    getFilePublicUrl(brand.primary_logo_file) ??
    getFilePublicUrl(primaryLogoFile) ??
    brand.brand_logo_url ??
    null
  );
}

export function resolveLogoSetUrls(logoSet: LogoSetLike | null | undefined) {
  return {
    full: getFilePublicUrl(logoSet?.full),
    thumb: getFilePublicUrl(logoSet?.thumb),
    full_inverted: getFilePublicUrl(logoSet?.full_inverted),
    thumb_inverted: getFilePublicUrl(logoSet?.thumb_inverted),
    primary: getFilePublicUrl(logoSet?.primary),
  };
}

export function resolveCompanyLogoForDisplay(
  company: CompanyLike | null | undefined,
  logoSet?: LogoSetLike | null,
  primaryLogoFile?: FileLike | null,
) {
  const urls = resolveLogoSetUrls(logoSet);
  return (
    urls.thumb ??
    urls.full ??
    urls.primary ??
    getFilePublicUrl(company?.primary_logo_file) ??
    getFilePublicUrl(primaryLogoFile) ??
    company?.company_logo_url ??
    null
  );
}

export function resolveBrandLogoForDisplay(
  brand: BrandLike | null | undefined,
  logoSet?: LogoSetLike | null,
  primaryLogoFile?: FileLike | null,
) {
  const urls = resolveLogoSetUrls(logoSet);
  return (
    urls.thumb ??
    urls.full ??
    urls.primary ??
    getFilePublicUrl(brand?.primary_logo_file) ??
    getFilePublicUrl(primaryLogoFile) ??
    brand?.brand_logo_url ??
    null
  );
}

export function resolveParticipationLogo(
  participation: ParticipationLike | null | undefined,
  company: CompanyLike | null | undefined,
  options?: {
    participationLogoFile?: FileLike | null;
    companyLogoFile?: FileLike | null;
  },
) {
  return (
    getFilePublicUrl(participation?.public_logo_file) ??
    getFilePublicUrl(options?.participationLogoFile) ??
    getFilePublicUrl(company?.primary_logo_file) ??
    getFilePublicUrl(options?.companyLogoFile) ??
    company?.company_logo_url ??
    null
  );
}
