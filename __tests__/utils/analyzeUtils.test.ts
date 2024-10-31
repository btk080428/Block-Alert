import { analyzeTransaction } from "../../src/utils/analyzeUtils";
import { TransactionData } from "../../src/types/interfaces";

describe("analyzeTransaction", () => {
  const mockKey =
    "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz";

  const createMockTx = (
    overrides: Partial<TransactionData> = {}
  ): TransactionData => ({
    blockHash: null,
    confirmations: 0,
    height: null,
    transactionId: "mock-txid",
    outputs: {
      keyPath: "m/0/0",
      scriptPubKey: "mock-scriptPubKey",
      index: 0,
      value: 100000000,
    },
    inputs: [
      {
        inputIndex: 0,
        transactionId: "mock-input-txid",
        scriptPubKey: "mock-input-scriptPubKey",
        index: 0,
        value: 100000000,
        address: "mock-address",
      },
    ],
    timestamp: Date.now(),
    balanceChange: 0,
    replaceable: false,
    replacing: null,
    replacedBy: null,
    ...overrides,
  });

  it("should correctly analyze a received transaction", () => {
    let txData = createMockTx({
      balanceChange: 100000000,
      confirmations: 1,
      transactionId: "abc123",
      timestamp: 1722834003,
    });

    let result = analyzeTransaction(txData, mockKey);

    expect(result).toEqual({
      xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz",
      type: "Received",
      amount: 1,
      status: "Confirmed",
      txid: "abc123",
      timestamp: 1722834003,
    });

    txData = createMockTx({
      balanceChange: -500000000000,
      confirmations: 0,
      transactionId: "def456",
      timestamp: 1722834100,
    });

    result = analyzeTransaction(txData, mockKey);

    expect(result).toEqual({
      xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz",
      type: "Sent",
      amount: -5000,
      status: "Unconfirmed",
      txid: "def456",
      timestamp: 1722834100,
    });

    txData = createMockTx({
      balanceChange: 0,
      confirmations: 0,
      transactionId: "hij789",
      timestamp: 1722834200,
    });

    result = analyzeTransaction(txData, mockKey);

    expect(result).toEqual({
      xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz",
      type: "Unknown",
      amount: 0,
      status: "Unconfirmed",
      txid: "hij789",
      timestamp: 1722834200,
    });
  });
});
