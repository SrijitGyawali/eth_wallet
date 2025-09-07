"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet } from "ethers";

type GetWalletResponse = { user_id: string; address: string } | { error: string };
type DecryptResponse =
  | { user_id: string; privateKey: string; address: string }
  | { error: string };

export default function WalletPage() {
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<
    | { derived: string; expected: string; matches: boolean }
    | { error: string }
    | null
  >(null);

  const loadAddress = useCallback(async () => {
    setLoading(true);
    setVerifyResult(null);
    try {
      const res = await fetch("/api/wallet", { cache: "no-store" });
      const data: GetWalletResponse = await res.json();
      if ("address" in data) setAddress(data.address);
      else setAddress("");
    } catch {
      setAddress("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddress();
  }, [loadAddress]);

  const canVerify = useMemo(() => Boolean(address), [address]);

  const handleVerify = useCallback(async () => {
    if (!address) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await fetch("/api/wallet/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setVerifyResult({ error: err.error || `HTTP ${res.status}` });
        return;
      }

      const data = (await res.json()) as DecryptResponse;
      if ("privateKey" in data) {
        const wallet = new Wallet(data.privateKey);
        const derived = wallet.address;
        const expected = address;
        setVerifyResult({ derived, expected, matches: derived.toLowerCase() === expected.toLowerCase() });
      } else {
        setVerifyResult({ error: data.error });
      }
    } catch (e: any) {
      setVerifyResult({ error: e?.message || "verify failed" });
    } finally {
      setVerifyLoading(false);
    }
  }, [address]);

  return (
    <div className="mx-auto max-w-xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Wallet</h1>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Your address</div>
        <div className="font-mono break-all">
          {loading ? "Loading..." : address || "No wallet yet. Use POST /api/wallet to create one."}
        </div>
        <button
          className="inline-flex items-center rounded-md border px-3 py-1 text-sm"
          onClick={loadAddress}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Dev-only verification</div>
        <p className="text-sm text-muted-foreground">
          Calls /api/wallet/decrypt (enabled only when ENABLE_DEMO_DECRYPT=true) and checks the private key derives the same address.
        </p>
        <button
          className="inline-flex items-center rounded-md border px-3 py-1 text-sm"
          onClick={handleVerify}
          disabled={!canVerify || verifyLoading}
        >
          {verifyLoading ? "Verifying..." : "Verify private key → address"}
        </button>

        {verifyResult && "error" in verifyResult && (
          <div className="text-sm text-red-600">{verifyResult.error}</div>
        )}

        {verifyResult && "matches" in verifyResult && (
          <div className="space-y-1 text-sm">
            <div>Derived: <span className="font-mono break-all">{verifyResult.derived}</span></div>
            <div>Expected: <span className="font-mono break-all">{verifyResult.expected}</span></div>
            <div>
              Match: {verifyResult.matches ? (
                <span className="text-green-600">true</span>
              ) : (
                <span className="text-red-600">false</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


