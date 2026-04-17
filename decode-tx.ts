/**
 * decode-tx.ts — fetch a Solana transaction by signature and print its metadata.
 *
 * Usage:
 *   npm i @solana/web3.js
 *   npx ts-node decode-tx.ts <signature> [cluster]
 *   cluster = mainnet-beta (default) | testnet | devnet
 *
 * Example:
 *   npx ts-node decode-tx.ts Ahy9GEyiPzkrw54Js6rw43bD6m6V3zmDDK6nn6e8N2tskrbkiozhsMjcdBLvCgH5JAc8CFyUZiwWpyCNqQ4wmQb mainnet-beta
 */

import { Connection, clusterApiUrl, Cluster } from "@solana/web3.js";

const LAMPORTS_PER_SOL = 1_000_000_000;

async function main(): Promise<void> {
  const [, , sig, clusterArg = "mainnet-beta"] = process.argv;
  if (!sig) {
    console.error("usage: ts-node decode-tx.ts <signature> [cluster]");
    process.exit(1);
  }

  const cluster = clusterArg as Cluster;
  const connection = new Connection(clusterApiUrl(cluster), "confirmed");

  const tx = await connection.getParsedTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!tx) throw new Error(`transaction ${sig} not found on ${cluster}`);

  const { slot, blockTime, meta, transaction, version } = tx;
  const payer = transaction.message.accountKeys.find((k) => k.signer)?.pubkey.toBase58();
  const programs = Array.from(
    new Set(transaction.message.instructions.map((ix) => ix.programId.toBase58())),
  );

  const summary = {
    signature: sig,
    cluster,
    status: meta?.err ? { failed: meta.err } : "success",
    slot,
    blockTime,
    blockTimeIso: blockTime ? new Date(blockTime * 1000).toISOString() : null,
    version,
    feeLamports: meta?.fee ?? null,
    feeSol: meta?.fee != null ? meta.fee / LAMPORTS_PER_SOL : null,
    computeUnitsConsumed: meta?.computeUnitsConsumed ?? null,
    feePayer: payer,
    recentBlockhash: transaction.message.recentBlockhash,
    signatures: transaction.signatures,
    accountKeys: transaction.message.accountKeys.map((k) => ({
      pubkey: k.pubkey.toBase58(),
      signer: k.signer,
      writable: k.writable,
    })),
    instructionCount: transaction.message.instructions.length,
    programsInvoked: programs,
    innerInstructionCount:
      meta?.innerInstructions?.reduce((n, g) => n + g.instructions.length, 0) ?? 0,
    logs: meta?.logMessages ?? [],
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
