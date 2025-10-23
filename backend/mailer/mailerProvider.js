const https = require("https");

function postJson({ hostname, path, headers, body, timeoutMs = 10000 }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          resolve({ ok, status: res.statusCode, body: data });
        });
      }
    );
    req.on("error", (err) => reject(err));
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("Request timeout"));
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function sendViaSendGrid({ from, to, subject, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { tried: false };
  try {
    const res = await postJson({
      hostname: "api.sendgrid.com",
      path: "/v3/mail/send",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from, name: "FixIt" },
        subject,
        content: [{ type: "text/html", value: html }],
      },
    });
    if (res.ok) return { tried: true, ok: true };
    console.error("❌ SendGrid API failed:", res.status, res.body);
    return { tried: true, ok: false, error: res.body };
  } catch (e) {
    console.error("❌ SendGrid request error:", e.message);
    return { tried: true, ok: false, error: e.message };
  }
}

async function sendViaResend({ from, to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { tried: false };
  try {
    const res = await postJson({
      hostname: "api.resend.com",
      path: "/emails",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: { from, to, subject, html },
    });
    if (res.ok) return { tried: true, ok: true };
    console.error("❌ Resend API failed:", res.status, res.body);
    return { tried: true, ok: false, error: res.body };
  } catch (e) {
    console.error("❌ Resend request error:", e.message);
    return { tried: true, ok: false, error: e.message };
  }
}

// Main provider that tries HTTP APIs first (no SMTP ports), falls back to SMTP handled by caller
async function sendEmailViaApi({ to, subject, html }) {
  const from = process.env.FROM_EMAIL || process.env.EMAIL;
  if (!from) {
    console.error("❌ FROM_EMAIL/EMAIL not set for mailer API");
    return { ok: false, reason: "missing_from" };
  }

  // Try SendGrid
  const sg = await sendViaSendGrid({ from, to, subject, html });
  if (sg.tried) return { ok: !!sg.ok, provider: "sendgrid", error: sg.error };

  // Try Resend
  const rs = await sendViaResend({ from, to, subject, html });
  if (rs.tried) return { ok: !!rs.ok, provider: "resend", error: rs.error };

  // No API configured
  return { ok: false, reason: "no_api_configured" };
}

module.exports = { sendEmailViaApi };
