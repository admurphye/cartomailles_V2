import "server-only";

import { createClient } from "@supabase/supabase-js";

const INVITATION_REDIRECT_URL = "https://app.cartomailles.com/set-password";

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "Les variables NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY sont requises pour inviter une bêta-testeuse."
    );
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function inviteBetaTester(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Une adresse e-mail est requise.");
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    normalizedEmail,
    {
      redirectTo: INVITATION_REDIRECT_URL,
    }
  );

  if (error) {
    throw new Error(`Impossible d’envoyer l’invitation : ${error.message}`);
  }

  return data.user;
}
