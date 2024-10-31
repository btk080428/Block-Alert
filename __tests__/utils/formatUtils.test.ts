import { formatTransaction, formatUtxos } from "../../src/utils/formatUtils";
import { TransactionAnalysis, Utxos } from "../../src/types/interfaces";
import {} from "../../src/utils/convertUtils";

jest.mock("../../src/utils/convertUtils", () => ({
  convertUnixTimestamp: jest.fn((timestamp) => `MOCKED_DATE_${timestamp}`),
}));

describe("formatTransaction", () => {
  it("should format a received transaction", () => {
    const normalizeString = (str: string) => str.replace(/\s+/g, " ").trim();
    const analysis: TransactionAnalysis = {
      xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz",
      type: "Received",
      amount: 1,
      status: "Confirmed",
      txid: "abc123def456",
      timestamp: 1722834003,
    };

    const result = formatTransaction(analysis);
    expect(normalizeString(result)).toBe(
      normalizeString(`
        📝 TXID: abc123def4...c123def456
        ├─ ✅ Status: Confirmed
        ├─ 💵 Type: Received
        ├─ 💰 Amount: 1 BTC
        ├─ 🕒 Timestamp: MOCKED_DATE_1722834003
        └─ 🔑 XPUB: xpub6CUGRU...Au3fDVmz
      `)
    );
  });

  it("should format a sent transaction", () => {
    const normalizeString = (str: string) => str.replace(/\s+/g, " ").trim();
    const analysis: TransactionAnalysis = {
      xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz",
      type: "Sent",
      amount: -1.5,
      status: "Unconfirmed",
      txid: "def456abc123",
      timestamp: 1722834004,
    };

    const result = formatTransaction(analysis);
    expect(normalizeString(result)).toBe(
      normalizeString(`
        📝 TXID: def456abc1...f456abc123
        ├─ ⏳ Status: Unconfirmed
        ├─ 💸 Type: Sent
        ├─ 💰 Amount: 1.5 BTC (fees included)
        ├─ 🕒 Timestamp: MOCKED_DATE_1722834004
        └─ 🔑 XPUB: xpub6CUGRU...Au3fDVmz
      `)
    );
  });
});

describe("formatUtxos", () => {
  it("should format UTXOs correctly", () => {
    const normalizeString = (str: string) => str.replace(/\s+/g, " ").trim();
    const utxos: Utxos = {
      trackedSource: "xpun123",
      currentHeight: 100,
      spentUnconfirmed: [],
      derivationStrategy:
        "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz",
      confirmed: {
        utxOs: [
          {
            address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
            value: 100000000,
            confirmations: 1,
          },
        ],
        spentOutpoints: [],
      },
      unconfirmed: {
        utxOs: [
          {
            address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
            value: 50000000,
            confirmations: 0,
          },
        ],
        spentOutpoints: [],
      },
    };

    const result = formatUtxos(utxos);
    expect(normalizeString(result)).toBe(
      normalizeString(`
        🔍 Balance Report

        🔑 xpub6CUGRU...Au3fDVmz
         │
         └─📌 bc1qar0s...zzwf5mdq
           ├─ Unconfirmed: 0.5 BTC
           └─ Confirmed: 1 BTC
         │
         ├─ ⏳ Total Unconfirmed: 0.5 BTC
         └─ ✅ Total Confirmed: 1 BTC
      `)
    );
  });
});
