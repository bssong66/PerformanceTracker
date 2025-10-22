import { supabase } from "@/lib/supabase";

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Authentication token missing");
  }

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${session.access_token}`);

  return await fetch(input, { ...init, headers });
}
