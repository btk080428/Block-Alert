# Block-Alert

## Overview

This application registers a specific XPUB with NBXplorer and subscribes to its updates. When an update is detected, it sends notifications to users via Ntfy. Additionally, the application provides regular balance reports for the XPUB, ensuring users stay informed about their address status.

## Prerequisites

- **Node.js**: Tested with v20.18.0
- **NBXplorer**: Tested with v2.5.7
- **Ntfy Server**: Tested with v2.11.0

## Installation, Build, and Execution

### Clone the Repository

```bash
git clone https://github.com/btk080428/Block-Alert.git
cd Block-Alert
```

### Install Dependencies

```bash
npm install
```

### Build the Project

Compile the TypeScript code:

```bash
npm run build
```

### Run the Application

Start the application:

```bash
npm run start
```

## Environment Variables

Create a `.env` file in the root directory, and edit it to include your specific configurations.

**Environment Variables Description:**

- `NBXPLORER_URL`: The base URL for NBXplorer.
- `EXTENDED_PUBKEY`: The extended public key to monitor (XPUB or TPUB only). The format should follow [NBXplorer's derivation scheme](https://github.com/dgarage/NBXplorer/blob/master/docs/API.md#derivation-scheme). If needed, convert your key using `scripts/convertXpub.js`.
- `BALANCE_REPORT_INTERVAL_MS`: Interval in milliseconds for balance reporting.
- `NBXPLORER_COOKIE_PATH`: Path to the .cookie file for NBXplorer authentication (optional).
- `NTFY_URL`: The base URL for the ntfy server.
- `NTFY_TOPIC`: The ntfy topic to which notifications will be sent.
- `NTFY_USER`: Username for ntfy authentication (optional).
- `NTFY_PASSWORD`: Password for ntfy authentication (optional).

## Notifications

1. **Transaction Updates**: Whenever a new transaction involving an address derived from the monitored XPUB is detected, users will receive an update via ntfy. This notification will contain details such as the transaction hash, the current status (e.g., unconfirmed or confirmed), the amount, the timestamp, and a link button to view the transaction in a block explorer.

   **Example Notification**:

   ```
   📝 TXID: 70f6738036...4688828cc7
   ├─ ✅ Status: Confirmed
   ├─ 💵 Type: Received
   ├─ 💰 Amount: 0.0001 BTC
   ├─ 🕒 Timestamp: 2024/1/22 18:31
   └─ 🔑 XPUB: tpubDCbN7b...quNKCpbN
   [View on mempool.space]
   ```

2. **Balance Reports**: Users will also receive regular balance reports for all addresses derived from the monitored XPUB. The balance report is sent at intervals specified by the `BALANCE_REPORT_INTERVAL_MS` environment variable.

   **Example Notification**:

   ```
   🔍 Balance Report

   🔑 XPUB: tpubDC8msF...sP4zbQ1M
   |
   ├─📍 tb1q3jrh...f7zs3xqw
     ├─ Unconfirmed: 0 BTC
     └─ Confirmed: 0.00001 BTC
   |
   ├─ 📍 tb1qr6ew...e8cc45z3
     ├─ Unconfirmed: 0 BTC
     └─ Confirmed: 0.00004 BTC
   |
   └─ 📍 tb1q6rz2...9pqcpvkl
     ├─ Unconfirmed: 0 BTC
     └─ Confirmed: 0.00016621 BTC
   ├─ ⏳ Total Unconfirmed: 0 BTC
   └─ ✅ Total Confirmed: 0.00021621 BTC
   ```

## `scripts` Directory

The `scripts/` directory contains utility scripts that assist in the setup and configuration of the project.

**createEnv.js**: This script is used to create the `.env` file with the necessary environment variables by interacting with the user.

```bash
node scripts/createEnv.js
```

**convertXpub.js**: This script is used to convert an extended public key (e.g., ypub, zpub, upub, vpub) to a compatible format (xpub or tpub) for use in this project.

```bash
node scripts/convertXpub.js
```

## `regtest` Directory

The `regtest/` directory includes scripts specifically for testing **Block-Alert** in a Bitcoin Regtest environment. These scripts allow developers to simulate Bitcoin transaction flows and verify the behavior of Block-Alert without interacting with the live Bitcoin network.

To set up testing, create a `.env.regtest` file in the `regtest/` directory by following `regtest/.env.regtest.sample`. Run the script using the following command:

```bash
node regtest/regtest.js
```

This script automates the process of creating a wallet, generating addresses, mining blocks, and sending transactions. It ensures that Block-Alert correctly sends notifications via ntfy for various transaction states.

## Docker

### Build the Docker Image

```bash
docker build -t block-alert .
```

### Run the Docker Container

```bash
docker run -d \
  --name block-alert \
  -e NBXPLORER_URL=http://127.0.0.1:24444 \
  -e EXTENDED_PUBKEY=xpub... \
  -e BALANCE_REPORT_INTERVAL_MS=3600000 \
  -e NTFY_URL=http://127.0.0.1:80 \
  -e NTFY_TOPIC=ntfy_topic \
  block-alert
```

## Testing

### Run Tests

```bash
npm run test
```

## License

MIT

## Note

This project has been tested with Bitcoin only.
