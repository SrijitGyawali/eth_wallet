import crypto from "crypto";
import { Wallet } from "ethers";

const MASTER_KEY_BASE64 = process.env.MASTER_KEY_BASE64 || "";
const MASTER_KEY = MASTER_KEY_BASE64
  ? Buffer.from(MASTER_KEY_BASE64, "base64")
  : crypto.randomBytes(32);

export function deriveAesKeyHKDF(masterSecret: Buffer, salt: Buffer, info = "eth-key-encryption") {
  return crypto.hkdfSync("sha256", masterSecret, salt, Buffer.from(info), 32);
}

export function createAccountAndEncrypt(masterSecret = MASTER_KEY) {
  const wallet = Wallet.createRandom();   
  const privateKeyHex = wallet.privateKey;
  const privateKeyBuffer = Buffer.from(privateKeyHex.slice(2), "hex");

  const salt = crypto.randomBytes(16);
  const aesKey = Buffer.from(deriveAesKeyHKDF(masterSecret, salt));

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv, { authTagLength: 16 });
  const ciphertext = Buffer.concat([cipher.update(privateKeyBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    eth_address: wallet.address,
    encrypted_private_key: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    salt: salt.toString("base64"),
    kdf: "HKDF-SHA256",
    version: 1,
    created_at: new Date().toISOString(),
  };
}

export function decryptEnvelope(envelope: {
  encrypted_private_key: string;
  iv: string;
  tag: string;
  salt: string;
  kdf: string;
  version: number;
}, masterSecret = MASTER_KEY) {
  if (!envelope || envelope.kdf !== "HKDF-SHA256" || envelope.version !== 1) {
    throw new Error("Unsupported envelope format");
  }

  const salt = Buffer.from(envelope.salt, "base64");
  const key = Buffer.from(deriveAesKeyHKDF(masterSecret, salt));
  const iv = Buffer.from(envelope.iv, "base64");
  const tag = Buffer.from(envelope.tag, "base64");
  const ciphertext = Buffer.from(envelope.encrypted_private_key, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  const privateKeyHex = "0x" + plaintext.toString("hex");
  const wallet = new Wallet(privateKeyHex);
  return { privateKey: privateKeyHex, address: wallet.address, wallet };
}