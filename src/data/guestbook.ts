export interface GuestEntry {
  name: string;
  message: string;
  date: string;
}

// Publish only real, owner-curated entries with the writer's permission.
export const entries: GuestEntry[] = [];
