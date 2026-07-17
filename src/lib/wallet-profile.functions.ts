import { createServerFn } from "@tanstack/react-start";

function normAddr(a: string) {
  const s = String(a ?? "").trim();
  if (!/^[A-Za-z0-9]{20,128}$/.test(s)) throw new Error("Invalid wallet address");
  return s;
}

function normUsername(u: string) {
  const s = String(u ?? "").trim();
  if (!/^[A-Za-z0-9_]{3,24}$/.test(s)) throw new Error("Invalid username");
  return s;
}

export const lookupProfileByAddressFn = createServerFn({ method: "POST" })
  .inputValidator((d: { wallet_address: string }) => ({ wallet_address: normAddr(d?.wallet_address) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("wallet_profiles")
      .select("wallet_address, username")
      .eq("wallet_address", data.wallet_address)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: row ?? null };
  });

export const isUsernameTakenFn = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string }) => ({ username: normUsername(d?.username) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("wallet_profiles")
      .select("username")
      .ilike("username", data.username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { taken: !!row };
  });

export const registerWalletProfileFn = createServerFn({ method: "POST" })
  .inputValidator((d: { wallet_address: string; username: string }) => ({
    wallet_address: normAddr(d?.wallet_address),
    username: normUsername(d?.username),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("wallet_profiles")
      .insert({ wallet_address: data.wallet_address, username: data.username })
      .select("wallet_address, username")
      .single();
    if (error) throw new Error(error.message);
    return { profile: row };
  });
