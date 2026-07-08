import crypto from "crypto";

import { db } from "@/lib/db";
import { sendNewDeviceEmail } from "@/lib/mail";

/** Minimal, dependency-free user-agent parsing — enough for device auditing. */
export function parseUserAgent(ua: string) {
  const browser = ua.includes("Edg/")
    ? "Edge"
    : ua.includes("OPR/")
      ? "Opera"
      : ua.includes("Chrome/")
        ? "Chrome"
        : ua.includes("Firefox/")
          ? "Firefox"
          : ua.includes("Safari/")
            ? "Safari"
            : "Unknown browser";

  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS X")
      ? "macOS"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("iPhone") || ua.includes("iPad")
          ? "iOS"
          : ua.includes("Linux")
            ? "Linux"
            : "Unknown OS";

  return { browser, os };
}

/**
 * Upsert a device session for the signed-in user, keyed by a fingerprint of
 * user-agent + coarse IP. Sends a "new device" alert email the first time a
 * fingerprint is seen (skipped for the very first device — that's signup).
 */
export async function recordDeviceSession(params: {
  userId: string;
  email: string;
  name?: string | null;
  userAgent: string;
  ip: string;
}) {
  const { userId, email, name, userAgent, ip } = params;
  // Coarse IP (first two octets) so DHCP churn doesn't spam alerts.
  const coarseIp = ip.split(".").slice(0, 2).join(".");
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${userAgent}|${coarseIp}`)
    .digest("hex");

  const existing = await db.deviceSession.findUnique({
    where: { userId_fingerprint: { userId, fingerprint } },
  });

  if (existing) {
    await db.deviceSession.update({
      where: { id: existing.id },
      data: { lastActiveAt: new Date(), ip },
    });
    return { isNewDevice: false };
  }

  const { browser, os } = parseUserAgent(userAgent);
  const deviceCount = await db.deviceSession.count({ where: { userId } });

  await db.deviceSession.create({
    data: { userId, fingerprint, browser, os, ip, userAgent },
  });

  // Don't alert on the account's very first device.
  if (deviceCount > 0) {
    await sendNewDeviceEmail({
      to: email,
      name: name ?? "there",
      browser,
      os,
      ip,
      time: new Date(),
    });
    return { isNewDevice: true };
  }

  return { isNewDevice: false };
}
