"use client";

import {
  createAccount,
  createClient,
  generatePrivateKey,
} from "genlayer-js";
import { studionet } from "genlayer-js/chains";

type Hex = `0x${string}`;
type GLClient = ReturnType<typeof createClient>;
type GLAccount = ReturnType<typeof createAccount>;

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BOUNTIQ_CONTRACT_ADDRESS as
  | Hex
  | undefined;

const KEY_STORAGE_PREFIX = "bountiq.genlayer.key.";

function getStoredKey(uid: string): Hex | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY_STORAGE_PREFIX + uid);
  return v ? (v as Hex) : null;
}

function storeKey(uid: string, key: Hex) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_STORAGE_PREFIX + uid, key);
}

export function getOrCreateLocalAccount(uid: string): GLAccount {
  let key = getStoredKey(uid);
  if (!key) {
    key = generatePrivateKey() as Hex;
    storeKey(uid, key);
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
    throw new Error(
      "NEXT_PUBLIC_BOUNTIQ_CONTRACT_ADDRESS is not set. Deploy the contract and update frontend/.env.local.",
    );
  }
  return CONTRACT_ADDRESS;
}

export function getLocalAddress(uid: string): Hex {
  return getOrCreateLocalAccount(uid).address as Hex;
}
