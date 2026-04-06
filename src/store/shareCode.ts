import pako from 'pako';
import type { Ending } from '../game/types';

const SCHEMA_VERSION = 1 as const;
const MAX_URL_LENGTH = 1900;

export type ShareEnvelope = {
  v: typeof SCHEMA_VERSION;
  payload: {
    characterName: string;
    ending: Ending;
  };
};

export function encodeShareCode(
  characterName: string,
  ending: Ending,
): string {
  const envelope: ShareEnvelope = {
    v: SCHEMA_VERSION,
    payload: { characterName, ending },
  };
  const json = JSON.stringify(envelope);
  const compressed = pako.deflateRaw(new TextEncoder().encode(json));
  const base64 = bytesToBase64Url(compressed);
  if (base64.length > MAX_URL_LENGTH) {
    // Truncate epitaph if too long
    const trimmed: ShareEnvelope = {
      v: SCHEMA_VERSION,
      payload: {
        characterName,
        ending: { ...ending, epitaph: ending.epitaph.slice(0, 6) },
      },
    };
    const j2 = JSON.stringify(trimmed);
    const c2 = pako.deflateRaw(new TextEncoder().encode(j2));
    return bytesToBase64Url(c2);
  }
  return base64;
}

export function decodeShareCode(code: string): ShareEnvelope | null {
  try {
    const bytes = base64UrlToBytes(code);
    const decompressed = pako.inflateRaw(bytes);
    const json = new TextDecoder().decode(decompressed);
    const parsed = JSON.parse(json) as ShareEnvelope;
    if (parsed.v !== SCHEMA_VERSION) {
      console.warn('Share code has unsupported version:', parsed.v);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildShareUrl(code: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}s=${code}`;
}

export function extractShareCodeFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get('s');
  } catch {
    return null;
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(code: string): Uint8Array {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const str = atob(b64 + pad);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}
