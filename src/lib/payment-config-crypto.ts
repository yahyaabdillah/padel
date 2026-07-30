import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";

function deriveKey(secret: string): Buffer {
  if (secret.length < 32) {
    throw new Error("PAYMENT_CONFIG_ENCRYPTION_KEY minimal 32 karakter.");
  }
  return createHash("sha256").update(secret).digest();
}

export function getPaymentEncryptionKey(): string {
  const key =
    process.env.PAYMENT_CONFIG_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!key) {
    throw new Error(
      "PAYMENT_CONFIG_ENCRYPTION_KEY atau SESSION_SECRET belum dikonfigurasi.",
    );
  }
  return key;
}

export function encryptPaymentSecret(value: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

export function decryptPaymentSecret(value: string, secret: string): string {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = value.split(".");
  if (
    version !== VERSION ||
    !ivEncoded ||
    !tagEncoded ||
    !ciphertextEncoded
  ) {
    throw new Error("Format kredensial pembayaran tidak valid.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(secret),
    Buffer.from(ivEncoded, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
