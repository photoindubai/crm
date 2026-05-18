export const LOGO_FILE_CATEGORY = "logo" as const;

export const LOGO_ROLES = ["full", "thumb", "full_inverted", "thumb_inverted"] as const;
export const DOWNLOADABLE_LOGO_ROLES = ["full", "full_inverted"] as const;

export type LogoRole = (typeof LOGO_ROLES)[number];

export function isLogoRole(value: string | null | undefined): value is LogoRole {
  return LOGO_ROLES.includes((value ?? "") as LogoRole);
}
