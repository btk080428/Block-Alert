import { TransactionData, TransactionAnalysis } from "../types/interfaces";

export function analyzeTransaction(
  txData: TransactionData,
  derivationStrategy: string
): TransactionAnalysis {
  return {
    xpub: derivationStrategy,
    type:
      txData.balanceChange > 0
        ? "Received"
        : txData.balanceChange < 0
        ? "Sent"
        : "Unknown",
    amount: txData.balanceChange / 1e8,
    status: txData.confirmations > 0 ? "Confirmed" : "Unconfirmed",
    txid: txData.transactionId,
    timestamp: txData.timestamp,
  };
}
