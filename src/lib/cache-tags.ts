export const cacheTags = {
  profiles: "crm:profiles",
  dashboard: "crm:dashboard",
  companies: "crm:companies",
  company: (id: string) => `crm:company:${id}`,
  participations: "crm:participations",
  participation: (id: string) => `crm:participation:${id}`,
  contacts: "crm:contacts",
  contact: (id: string) => `crm:contact:${id}`,
  brands: "crm:brands",
  brand: (id: string) => `crm:brand:${id}`,
  events: "crm:events",
  event: (id: string) => `crm:event:${id}`,
  smm: "crm:smm",
  actions: "crm:actions",
  actionTemplates: "crm:action-templates",
  notes: "crm:notes",
} as const;

export type CacheTag = string;
