import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getWalletByUserId } from "@/lib/db/queries";
import { decryptEnvelope } from "@/lib/eth-key-utils";

// DEV-ONLY: POST /api/wallet/decrypt
// Body (optional): { user_id: string } — defaults to current user
// Returns: { user_id, privateKey, address }
// WARNING: For demo/testing only. Disable in production.
export async function POST(request: Request) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const demoEnabled = process.env.ENABLE_DEMO_DECRYPT === "true";

    if (isProduction || !demoEnabled) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    let userId = session.user.id;
    try {
      const body = await request.json();
      if (body?.user_id && typeof body.user_id === "string") {
        userId = body.user_id;
      }
    } catch {}

    const wallet = await getWalletByUserId({ userId });
    if (!wallet) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { privateKey, address } = decryptEnvelope({
      encrypted_private_key: wallet.encryptedPrivateKey,
      iv: wallet.iv,
      tag: wallet.tag,
      salt: wallet.salt,
      kdf: wallet.kdf,
      version: wallet.version,
    });

    return NextResponse.json({ user_id: userId, privateKey, address }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "decryption_failed", details: error?.message },
      { status: 500 },
    );
  }
}


