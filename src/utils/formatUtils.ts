import { TransactionAnalysis, Utxos } from "../types/interfaces";
import { convertUnixTimestamp } from "./convertUtils";

export function formatTransaction(transaction: TransactionAnalysis): string {
  const typeEmoji = {
    Received: "💵",
    Sent: "💸",
    Unknown: "❓",
  };

  const statusEmoji = {
    Confirmed: "✅",
    Unconfirmed: "⏳",
  };

  const amountString = {
    Sent: `${Math.abs(transaction.amount)} BTC (fees included)`,
    Received: `${Math.abs(transaction.amount)} BTC`,
    Unknown: `${Math.abs(transaction.amount)} BTC`,
  };

  const formattedDate = convertUnixTimestamp(transaction.timestamp);

  return `
📝 TXID: ${transaction.txid.slice(0, 10)}...${transaction.txid.slice(-10)}
├─ ${statusEmoji[transaction.status]} Status: ${transaction.status}
├─ ${typeEmoji[transaction.type]} Type: ${transaction.type}
├─ 💰 Amount: ${amountString[transaction.type]}
├─ 🕒 Timestamp: ${formattedDate}
└─ 🔑 XPUB: ${transaction.xpub.slice(0, 10)}...${transaction.xpub.slice(-8)}
`.trim();
}

export function formatUtxos(utxos: Utxos): string {
  let message = "🔍 Balance Report\n\n";
  const addressBalances: Record<
    string,
    { unconfirmed: number; confirmed: number }
  > = {};

  utxos.unconfirmed.utxOs.concat(utxos.confirmed.utxOs).forEach((utxo) => {
    if (!addressBalances[utxo.address]) {
      addressBalances[utxo.address] = { unconfirmed: 0, confirmed: 0 };
    }
    if (utxo.confirmations === 0) {
      addressBalances[utxo.address].unconfirmed += utxo.value;
    } else {
      addressBalances[utxo.address].confirmed += utxo.value;
    }
  });

  const unconfirmedBalance =
    Object.values(addressBalances).reduce(
      (acc, balances) => acc + balances.unconfirmed,
      0
    ) / 1e8;
  const confirmedBalance =
    Object.values(addressBalances).reduce(
      (acc, balances) => acc + balances.confirmed,
      0
    ) / 1e8;

  message += `🔑 ${utxos.derivationStrategy.slice(
    0,
    10
  )}...${utxos.derivationStrategy.slice(-8)}\n`;
  const addresses = Object.keys(addressBalances);
  addresses.forEach((address, addrIndex) => {
    const isLast = addrIndex === addresses.length - 1;
    message += ` │\n ${isLast ? "└" : "├"}─📌 ${address.slice(
      0,
      8
    )}...${address.slice(-8)}\n`;
    message += ` ${isLast ? " " : "│"}  ├─ Unconfirmed: ${
      addressBalances[address].unconfirmed / 1e8
    } BTC\n`;
    message += ` ${isLast ? " " : "│"}  └─ Confirmed: ${
      addressBalances[address].confirmed / 1e8
    } BTC\n`;
  });

  message += ` │\n ├─ ⏳ Total Unconfirmed: ${unconfirmedBalance} BTC\n`;
  message += ` └─ ✅ Total Confirmed: ${confirmedBalance} BTC\n\n`;

  return message;
}
