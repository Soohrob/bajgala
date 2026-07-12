// Supabase Edge Function: emails each new notification to its user via Resend.
//
// Setup (once you have a Resend account — free tier is fine):
//   1. supabase secrets set RESEND_API_KEY=re_xxx  (or set it in Dashboard → Edge Functions → Secrets)
//   2. supabase functions deploy notify-email --no-verify-jwt
//      (or paste this file in Dashboard → Edge Functions → New function)
//   3. Dashboard → Database → Webhooks → Create:
//      table: notifications, events: INSERT, type: Supabase Edge Function → notify-email
//
// Until a custom domain is verified in Resend, set FROM to "onboarding@resend.dev"
// (Resend's sandbox sender) — it can only email your own account's address.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const FROM = 'ScrapMap ATL <onboarding@resend.dev>'

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record as { user_id: string; message: string } | undefined
    if (!record) return new Response('no record', { status: 400 })

    // Service-role client to look up the recipient's email (RLS bypass).
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: userData, error } = await supabase.auth.admin.getUserById(record.user_id)
    if (error || !userData.user?.email) return new Response('no user email', { status: 200 })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: userData.user.email,
        subject: 'ScrapMap ATL — news from your block',
        text: `${record.message}\n\nOpen ScrapMap to see the details.`,
      }),
    })
    return new Response(await res.text(), { status: res.status })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})
