// POST /api/subscribe — saves a browser's push subscription so /api/notify can reach it later.
const { Redis } = require("@upstash/redis");

const redis = Redis.fromEnv();

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  let sub = req.body;
  if (typeof sub === "string") {
    try { sub = JSON.parse(sub); } catch (e) { sub = null; }
  }
  if (!sub || !sub.endpoint) {
    res.status(400).json({ error: "Missing push subscription" });
    return;
  }

  await redis.set(`sub:${sub.endpoint}`, JSON.stringify(sub));
  await redis.sadd("subs", sub.endpoint);

  res.status(201).json({ ok: true });
};
