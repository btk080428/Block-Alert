const axios = require("axios");
const bitcoin = require("bitcoinjs-lib");
const BIP32Factory = require("bip32").default;
const ecc = require("tiny-secp256k1");

const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env.regtest") });

const bip32 = BIP32Factory(ecc);
const NETWORK = bitcoin.networks.regtest;

/**
 * This code is designed to test block-alert.
 *
 * PURPOSE:
 * Due to the nature of Bitcoin, to verify the behavior of block-alert, you need to simulate
 * a Bitcoin transaction flow. This script derives P2WPKH address from a given XPUB (using index 0
 * for external address) and sends 0.0001 BTC to it. The code uses the regtest network.
 *
 * EXPECTED BEHAVIOR:
 * If everything works correctly, block-alert should send notifications
 * via Ntfy. There should be 4 notifications in total:
 * 1. Setup completion message
 * 2. Balance Report: Initial balance report
 * 3. Unconfirmed: When the transaction is in mempool
 * 4. Confirmed: When the transaction is in a block
 *
 * REQUIREMENTS:
 * 1. Bitcoin Core must be running in regtest mode.
 * 2. NBXplorer must be running in regtest mode.
 * 3. Ntfy server must be running.
 * 4. block-alert must be running.
 * 5. The specified XPUB must be registered with NBXplorer.
 *
 * SETUP INSTRUCTIONS:
 * Before running this script, you need to set up the environment variables:
 * 1. Create a file named '.env.regtest' in the same directory as this script (the regtest directory).
 * 2. Add the following variables to the .env.regtest file:
 *    RPC_BASE_URL=http://localhost:18443
 *    RPC_USER=your_rpc_username
 *    RPC_PASSWORD=your_rpc_password
 *    XPUB=your_xpub_for_testing
 * 3. Replace the values with your actual regtest configuration.
 *
 * NOTE:
 * Mainnet xpub cannot be used. This code is compatible with tpub (testnet p2pkh or p2sh),
 * Please use the conversion script in 'scripts/convertXpub.js' if necessary.
 * Depending on the block height in the regtest environment, there may be insufficient funds for transactions.
 */

const RPC_BASE_URL = process.env.RPC_BASE_URL;
const RPC_USER = process.env.RPC_USER;
const RPC_PASSWORD = process.env.RPC_PASSWORD;
const XPUB = process.env.XPUB;

const WALLET_NAME = "temp";

if (!RPC_BASE_URL || !RPC_USER || !RPC_PASSWORD || !XPUB) {
  console.error(
    "Error: Missing required environment variables. Please ensure you have created the '.env.regtest' file in the regtest directory with RPC_BASE_URL, RPC_USER, RPC_PASSWORD, and XPUB set correctly."
  );
  process.exit(1);
}

async function callRpc(method, params = [], wallet) {
  let url = RPC_BASE_URL;
  if (wallet) {
    url += `/wallet/${wallet}`;
  }
  try {
    const response = await axios.post(
      url,
      {
        jsonrpc: "1.0",
        id: "curltest",
        method,
        params,
      },
      {
        auth: {
          username: RPC_USER,
          password: RPC_PASSWORD,
        },
      }
    );
    return response.data.result;
  } catch (error) {
    console.error(`Error calling RPC ${method}:`, error);
    throw new Error(`RPC call failed: ${method}`);
  }
}

function deriveAddress() {
  const node = bip32.fromBase58(XPUB, NETWORK);
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: node.derive(0).derive(0).publicKey,
    network: NETWORK,
  });
  return address;
}

async function main() {
  try {
    console.log("Creating wallet...");
    await callRpc("createwallet", [WALLET_NAME]);
    console.log(`Wallet '${WALLET_NAME}' created successfully.`);

    console.log("Generating new address...");
    const newAddress = await callRpc(
      "getnewaddress",
      ["", "bech32"],
      WALLET_NAME
    );
    console.log("New address generated:", newAddress);

    console.log("Mining blocks...");
    await callRpc("generatetoaddress", [101, newAddress], WALLET_NAME);
    console.log(`Mined 101 blocks to address ${newAddress}`);

    console.log(
      "Waiting 10 seconds for NBXplorer to process incoming blocks..."
    );
    await new Promise((resolve) => setTimeout(resolve, 10000));

    console.log("Deriving p2wpkh address from xpub...");
    const derivedAddress = deriveAddress();
    console.log(`Derived address: ${derivedAddress}`);

    console.log(`Sending 0.0001 BTC to ${derivedAddress}...`);
    const txid = await callRpc(
      "sendtoaddress",
      [
        derivedAddress,
        0.0001,
        "",
        "",
        false,
        true,
        null,
        "unset",
        false,
        1,
        false,
      ],
      WALLET_NAME
    );
    console.log(`Transaction sent. TXID: ${txid}`);

    console.log("Waiting for 10 seconds before confirming the transaction...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    await callRpc("generatetoaddress", [1, newAddress], WALLET_NAME);
    console.log(`Mined 1 blocks to address ${newAddress}`);

    console.log("The process has completed successfully.");
    console.log(
      `To delete the wallet, please run: bitcoin-cli unloadwallet "${WALLET_NAME}" && rm -rf ~/.bitcoin/regtest/wallets/${WALLET_NAME}`
    );
  } catch (error) {
    console.error(error);
  }
}

main().catch((error) => console.error(error));
