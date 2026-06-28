// RambleBabble uses plain username + password. Supabase Auth needs an email,
// so we deterministically map a username to a stable internal email. The user
// never sees this; they only ever type their username.
export function usernameToEmail(username: string): string {
  const clean = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");
  return `${clean}@ramblebabble.app`;
}
