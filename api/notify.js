// GET /api/notify?key=YOUR_SECRET — sends a push to every subscribed browser.
// Hit this URL from an external scheduler (cron-job.org) at 10:00, 12:00, 15:00, 17:00, 20:00
// Europe/Stockholm time. See the setup guide, step 6.
const webpush = require("web-push");
const { Redis } = require("@upstash/redis");

const redis = Redis.fromEnv();

webpush.setVapidDetails(
  process.env.VAPID_CONTACT_EMAIL || "mailto:you@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async function handler(req, res) {
  if (req.query.key !== process.env.NOTIFY_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const endpoints = (await redis.smembers("subs")) || [];
  const payload = JSON.stringify({
    title: "DROPLET",
    body: "Time for some water",
  });

  let sent = 0;
  let removed = 0;

  for (const endpoint of endpoints) {
    const raw = await redis.get(`sub:${endpoint}`);
    if (!raw) continue;
    const sub = typeof raw === "string" ? JSON.parse(raw) : raw;
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      // 404/410 means the subscription is dead (uninstalled, expired) — clean it up
      if (err.statusCode === 404 || err.statusCode === 410) {
        await redis.srem("subs", endpoint);
        await redis.del(`sub:${endpoint}`);
        removed++;
      }
    }
  }

  res.status(200).json({ sent, removed, total: endpoints.length });
};
