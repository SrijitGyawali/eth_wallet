import { NextResponse } from "next/server";
import { createAccountAndEncrypt } from "@/lib/eth-key-utils";
import { auth } from "@/app/(auth)/auth";
import { getWalletByUserId, saveWallet } from "@/lib/db/queries";

// GET /api/wallet
// Returns: { user_id, address } for the authenticated user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const existing = await getWalletByUserId({ userId });

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(
      { user_id: userId, address: existing.ethAddress },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "failed_to_get_wallet", details: error?.message },
      { status: 500 },
    );
  }
}

// POST /api/wallet
// Body: { user_id: string }
// Returns: { user_id, address, encrypted_private_key, iv, tag, salt, kdf, version, created_at }
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const existing = await getWalletByUserId({ userId });
    if (existing) {
      return NextResponse.json(
        { error: "wallet already exists" },
        { status: 409 },
      );
    }

    const envelope = createAccountAndEncrypt();

    await saveWallet({
      userId,
      ethAddress: envelope.eth_address,
      encryptedPrivateKey: envelope.encrypted_private_key,
      iv: envelope.iv,
      tag: envelope.tag,
      salt: envelope.salt,
      kdf: envelope.kdf,
      version: envelope.version,
      createdAt: new Date(envelope.created_at),
    });

    return NextResponse.json(
      { user_id: userId, address: envelope.eth_address },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "failed_to_create_account", details: error?.message },
      { status: 500 },
    );
  }
}


