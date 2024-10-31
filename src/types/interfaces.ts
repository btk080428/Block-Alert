export interface TransactionAnalysis {
  xpub: string;
  type: "Received" | "Sent" | "Unknown";
  amount: number;
  status: "Confirmed" | "Unconfirmed";
  txid: string;
  timestamp: number;
}

export interface TransactionData {
  blockHash: string | null;
  confirmations: number;
  height: number | null;
  transactionId: string;
  outputs: {
    keyPath: string;
    scriptPubKey: string;
    index: number;
    value: number;
  };
  inputs: {
    inputIndex: number;
    transactionId: string;
    scriptPubKey: string;
    index: number;
    value: number;
    address: string;
  }[];
  timestamp: number;
  balanceChange: number;
  replaceable: boolean;
  replacing: string | null;
  replacedBy: string | null;
}

export interface NewTransactionMessage {
  type: string;
  eventId: number;
  data: {
    blockId: null;
    trackedSource: string;
    derivationStrategy: string;
    transactionData: {
      confirmations: number;
      blockId: null;
      transactionHash: string;
      transaction: string;
      height: null;
      timestamp: number;
    };
    inputs: {
      inputIndex: number;
      transactionId: string;
      scriptPubKey: string;
      index: number;
      value: number;
      address: string;
    }[];
    outputs: {
      keyPath: string;
      scriptPubKey: string;
      address: string;
      redeem: string;
      index: number;
      value: number;
    }[];
    cryptoCode: string;
    replacing: string[];
  };
}

export interface SubscribeMessage {
  type: "subscribetransaction";
  data: {
    cryptoCode: string;
    derivationSchemes?: Array<string>;
  };
}

export enum LogLevel {
  ERROR,
  WARN,
  INFO,
  DEBUG,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  meta?: any;
}

export interface Utxos {
  trackedSource: string;
  derivationStrategy: string;
  currentHeight: number;
  unconfirmed: {
    utxOs: any[];
    spentOutpoints: any[];
  };
  confirmed: {
    utxOs: any[];
    spentOutpoints: any[];
  };
  spentUnconfirmed: any[];
}
