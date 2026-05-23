"use client";

import {
  createAccount,
  createClient,
  generatePrivateKey,
} from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { doc as fsDoc, getDoc as fsGetDoc, setDoc as fsSetDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

type Hex = `0x${string}`;
type GLClient = ReturnType<typeof createClient>;
type GLAccount = ReturnType<typeof createAccount>;

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTIQ_CONTRACT_ADDRESS as Hex | undefined;
const KEY_STORAGE_PREFIX = "bountiq.genlayer.key.";
const APP_SALT = "bountiq-v1-2026-genlayer";

function getStoredKey(uid: string): Hex | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY_STORAGE_PREFIX + uid);
  return v ? (v as Hex) : null;
}

function storeKey(uid: string, key: Hex) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_STORAGE_PREFIX + uid, key);
}

export function clearStoredKey(uid: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY_STORAGE_PREFIX + uid);
  cachedClient = null;
  cachedClientUid = null;
}

export function getOrCreateLocalAccount(uid: string): GLAccount {
  const key = getStoredKey(uid);
  if (!key) {
    throw new Error("Wallet is locked. Please unlock with your PIN.");
  }
  return createAccount(key);
}

let cachedClient: GLClient | null = null;
let cachedClientUid: string | null = null;

export function getGenLayerClient(uid: string): GLClient {
  if (cachedClient && cachedClientUid === uid) return cachedClient;
  const account = getOrCreateLocalAccount(uid);
  cachedClient = createClient({ chain: studionet, account });
  cachedClientUid = uid;
  return cachedClient;
}

export function getContractAddress(): Hex {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_BOUNTIQ_CONTRACT_ADDRESS is not set.");
  }
  return CONTRACT_ADDRESS;
}

export function getLocalAddress(uid: string): Hex {
  return getOrCreateLocalAccount(uid).address as Hex;
}

export async function getGenBalance(uid: string): Promise<bigint> {
  try {
    const client = getGenLayerClient(uid);
    const account = getOrCreateLocalAccount(uid);
    const bal = await client.getBalance({ address: account.address });
    return BigInt(bal as unknown as string | number | bigint);
  } catch (e) {
    console.warn("getGenBalance failed:", e);
    return 0n;
  }
}

export function formatGen(value: bigint, decimals: number = 18, maxFractionDigits: number = 4): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  if (fraction === 0n) return whole.toString();
  let frac = fraction.toString().padStart(decimals, "0").slice(0, maxFractionDigits).replace(/0+$/, "");
  return frac ? `${whole.toString()}.${frac}` : whole.toString();
}

// ---------- PIN-based encryption ----------

async function deriveKeyFromPin(uid: string, pin: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(uid + ":" + APP_SALT),
      iterations: 150000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i] as number);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
  return bytes;
}

async function encryptWalletWithPin(uid: string, pin: string, privateKey: string) {
  const key = await deriveKeyFromPin(uid, pin);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(privateKey);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    data.buffer as ArrayBuffer,
  );
  return { ct: toB64(ct), iv: toB64(iv.buffer) };
}

async function decryptWalletWithPin(uid: string, pin: string, ctB64: string, ivB64: string) {
  const key = await deriveKeyFromPin(uid, pin);
  const iv = fromB64(ivB64);
  const ct = fromB64(ctB64);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    ct.buffer as ArrayBuffer,
  );
  return new TextDecoder().decode(pt);
}

export type WalletStatus = "setup" | "unlock" | "ready";

export async function getCloudWalletStatus(uid: string): Promise<WalletStatus> {
  const local = getStoredKey(uid);
  const db = getFirebaseDb();
  const ref = fsDoc(db, "users", uid, "secrets", "wallet");
  const snap = await fsGetDoc(ref);
  const data = snap.exists()
    ? (snap.data() as { ct?: string; iv?: string; privateKey?: string })
    : null;
  const hasEncrypted = Boolean(data?.ct && data?.iv);
  const hasPlaintext = Boolean(data?.privateKey);

  if (local) {
    return hasEncrypted ? "ready" : "setup";
  }
  if (hasEncrypted) return "unlock";
  if (hasPlaintext && data?.privateKey) {
    storeKey(uid, data.privateKey as Hex);
    cachedClient = null;
    cachedClientUid = null;
    return "setup";
  }
  return "setup";
}

export async function setupWalletWithPin(uid: string, pin: string): Promise<void> {
  let key = getStoredKey(uid);
  if (!key) {
    key = generatePrivateKey() as Hex;
    storeKey(uid, key);
    cachedClient = null;
    cachedClientUid = null;
  }
  const enc = await encryptWalletWithPin(uid, pin, key);
  const db = getFirebaseDb();
  const ref = fsDoc(db, "users", uid, "secrets", "wallet");
  await fsSetDoc(
    ref,
    {
      ct: enc.ct,
      iv: enc.iv,
      privateKey: null,
      createdAt: new Date().toISOString(),
      encryptedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function unlockWalletWithPin(uid: string, pin: string): Promise<{ ok: boolean }> {
  const db = getFirebaseDb();
  const ref = fsDoc(db, "users", uid, "secrets", "wallet");
  const snap = await fsGetDoc(ref);
  if (!snap.exists()) return { ok: false };
  const data = snap.data() as { ct?: string; iv?: string };
  if (!data.ct || !data.iv) return { ok: false };
  try {
    const plaintext = await decryptWalletWithPin(uid, pin, data.ct, data.iv);
    storeKey(uid, plaintext as Hex);
    cachedClient = null;
    cachedClientUid = null;
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
