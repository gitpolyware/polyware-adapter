import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

/** Verify Phantom signMessage (Ed25519 detached). signature is base64 from window.solana.signMessage(...) */
export function verifySignMessage(payload: string, signatureB64: string, publicKeyBase58: string): boolean {
  const msg = new TextEncoder().encode(payload);
  const sig = Uint8Array.from(Buffer.from(signatureB64, "base64"));
  const pub = new PublicKey(publicKeyBase58).toBytes();
  return nacl.sign.detached.verify(msg, sig, pub);
}
