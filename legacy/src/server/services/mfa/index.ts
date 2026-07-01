/**
 * mfa — TOTP-based MFA for ADMIN role.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — admin compromise =
 * total OS compromise. Founder trust + Operations integrity require
 * MFA on the operator console.
 *
 * Uses RFC 6238 TOTP with HMAC-SHA1, 30s window. Stores encrypted secret
 * in MfaSecret table (one row per user). Verification accepts ±1 step
 * for clock drift.
 */

import { createHmac, randomBytes } from "node:crypto";

const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const DRIFT_STEPS = 1;

// ── Base32 (RFC 4648) ─────────────────────────────────────────────────

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateBase32Secret(byteLength = 20): string {
  const bytes = randomBytes(byteLength);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.replace(/[\s=]/g, "").toUpperCase();
  let bits = "";
  for (const c of clean) {
    const i = BASE32_ALPHABET.indexOf(c);
    if (i < 0) throw new Error("Invalid base32");
    bits += i.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// ── TOTP ──────────────────────────────────────────────────────────────

function hotp(secret: Buffer, counter: bigint): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(counter);
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (bin % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, "0");
}

export function generateTotp(base32Secret: string, atSeconds = Math.floor(Date.now() / 1000)): string {
  const secret = base32Decode(base32Secret);
  const counter = BigInt(Math.floor(atSeconds / TOTP_PERIOD_SECONDS));
  return hotp(secret, counter);
}

export function verifyTotp(base32Secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(base32Secret);
  const baseCounter = BigInt(Math.floor(Date.now() / (1000 * TOTP_PERIOD_SECONDS)));
  for (let drift = -DRIFT_STEPS; drift <= DRIFT_STEPS; drift++) {
    if (hotp(secret, baseCounter + BigInt(drift)) === code) return true;
  }
  return false;
}

// ── otpauth:// URL builder (for QR codes) ────────────────────────────

export function otpauthUrl(opts: {
  issuer: string;
  account: string;
  secret: string;
}): string {
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer: opts.issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(opts.issuer)}:${encodeURIComponent(opts.account)}?${params}`;
}
