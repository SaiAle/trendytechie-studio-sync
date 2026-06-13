/**
 * Web Crypto API client-side helpers for real End-to-End Encryption (E2EE) of screenplay scripts and prompts.
 * This encrypts text utilizing AES-GCM with a user-supplied project passphrase.
 */

// Generate a derivation key from a passphrase text
async function getDeriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey", "deriveBits"]
  );

  // We use a fixed salt for simplicity in project sharing,
  // in a high-security environment, each project would have its salt stored together.
  const salt = enc.encode("LTX-Video-Salt-2026");

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt plaintext with passphrase
export async function encryptText(plaintext: string, passphrase?: string): Promise<string> {
  if (!passphrase || !plaintext) return plaintext;
  try {
    const key = await getDeriveKey(passphrase);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      enc.encode(plaintext)
    );

    const exportedIv = Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join("");
    const encryptedBytes = new Uint8Array(encrypted);
    const exportedData = Array.from(encryptedBytes).map(b => b.toString(16).padStart(2, "0")).join("");

    // Return format: iv:hex_data
    return `E2EE::${exportedIv}:${exportedData}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    return plaintext;
  }
}

// Decrypt ciphertext with passphrase
export async function decryptText(ciphertext: string, passphrase?: string): Promise<string> {
  if (!passphrase || !ciphertext || !ciphertext.startsWith("E2EE::")) return ciphertext;
  try {
    const key = await getDeriveKey(passphrase);
    const parts = ciphertext.split(":");
    if (parts.length < 3) return ciphertext;

    const ivHex = parts[1];
    const dataHex = parts[2];

    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encryptedData = new Uint8Array(dataHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encryptedData
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    console.warn("Decryption failed (perhaps incorrect key?):", error);
    return "🔓 [Protected Content: Enter correct project passcode to decrypt]";
  }
}
