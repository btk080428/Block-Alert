const readline = require("readline");
const fs = require("fs");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

(async () => {
  let NBXPLORER_URL;
  while (true) {
    NBXPLORER_URL = await askQuestion(
      "What is the NBXplorer URL? (e.g., http://127.0.0.1:24444)\n"
    );
    if (/^http(s)?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?$/.test(NBXPLORER_URL)) {
      break;
    } else {
      console.log("Invalid URL format. Please enter a valid URL.");
    }
  }

  let NBXPLORER_COOKIE_PATH = "";
  const SET_COOKIE_PATH = await askQuestion(
    "Do you want to configure NBXplorer authentication? (y/n)\n"
  );
  if (/^[Yy]$/.test(SET_COOKIE_PATH)) {
    NBXPLORER_COOKIE_PATH = await askQuestion(
      "Enter the path to the NBXplorer cookie file:\n"
    );
  }

  console.log(
    `+---------------------+------------------------------------------+`
  );
  console.log(
    `| Address type        | Format                                   |`
  );
  console.log(
    `+---------------------+------------------------------------------+`
  );
  console.log(
    `| P2WPKH              | xpub1                                    |`
  );
  console.log(
    `| P2SH-P2WPKH         | xpub1-[p2sh]                             |`
  );
  console.log(
    `| P2PKH               | xpub-[legacy]                            |`
  );
  console.log(
    `| Multi-sig P2WSH     | 2-of-xpub1-xpub2                         |`
  );
  console.log(
    `| Multi-sig P2SH-P2WSH| 2-of-xpub1-xpub2-[p2sh]                  |`
  );
  console.log(
    `| Multi-sig P2SH      | 2-of-xpub1-xpub2-[legacy]                |`
  );
  console.log(
    `| P2TR                | xpub1-[taproot]                          |`
  );
  console.log(
    `+---------------------+------------------------------------------+`
  );

  let EXTENDED_PUBKEY;
  while (true) {
    EXTENDED_PUBKEY = await askQuestion(
      "Please enter the extended public key based on the above formats.\n"
    );
    if (
      /^(xpub|tpub)[a-zA-Z0-9]+(\-\[(legacy|p2sh|taproot)\])?$/.test(
        EXTENDED_PUBKEY
      ) ||
      /^([0-9]+)-of-(xpub|tpub)[a-zA-Z0-9]+(-[xpub|tpub][a-zA-Z0-9]+)*(\-\[(legacy|p2sh)\])?$/.test(
        EXTENDED_PUBKEY
      )
    ) {
      break;
    } else {
      console.log(
        "Invalid extended public key format. Please enter a valid key."
      );
    }
  }

  console.log("How often would you like to receive balance reports?");
  console.log(
    "1) Every hour\n2) Every 2 hours\n3) Every 4 hours\n4) Every 6 hours\n5) Every 8 hours\n6) Every 12 hours\n7) Once a day"
  );

  let BALANCE_REPORT_INTERVAL_MS;
  while (true) {
    const INTERVAL_CHOICE = await askQuestion(
      "Enter the number of your choice (1-7): "
    );
    if (/^[1-7]$/.test(INTERVAL_CHOICE)) {
      BALANCE_REPORT_INTERVAL_MS = [
        3600000, 7200000, 14400000, 21600000, 28800000, 43200000, 86400000,
      ][INTERVAL_CHOICE - 1];
      break;
    } else {
      console.log("Invalid choice. Please enter a number between 1 and 7.");
    }
  }

  let NTFY_URL;
  while (true) {
    NTFY_URL = await askQuestion(
      "What is the Ntfy server URL? (e.g., http://127.0.0.1:80)\n"
    );
    if (/^http(s)?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?$/.test(NTFY_URL)) {
      break;
    } else {
      console.log("Invalid URL format. Please enter a valid URL.");
    }
  }

  let NTFY_USER = "";
  let NTFY_PASSWORD = "";
  const SET_NTFY_AUTH = await askQuestion(
    "Do you want to configure Ntfy authentication? (y/n)\n"
  );
  if (/^[Yy]$/.test(SET_NTFY_AUTH)) {
    NTFY_USER = await askQuestion("Enter Ntfy username:\n");
    NTFY_PASSWORD = await askQuestion("Enter Ntfy password:\n");
  }

  let NTFY_TOPIC;
  while (true) {
    NTFY_TOPIC = await askQuestion("What is the Ntfy topic?\n");
    if (NTFY_TOPIC.trim() !== "") {
      break;
    } else {
      console.log("Ntfy topic cannot be empty. Please enter a valid topic.");
    }
  }

  const envContent = `# NBXplorer settings
NBXPLORER_URL=${NBXPLORER_URL}
EXTENDED_PUBKEY=${EXTENDED_PUBKEY}
BALANCE_REPORT_INTERVAL_MS=${BALANCE_REPORT_INTERVAL_MS}
NBXPLORER_COOKIE_PATH=${NBXPLORER_COOKIE_PATH}

# Ntfy settings
NTFY_URL=${NTFY_URL}
NTFY_TOPIC=${NTFY_TOPIC}
NTFY_USER=${NTFY_USER}
NTFY_PASSWORD=${NTFY_PASSWORD}
`;

  fs.writeFileSync(".env", envContent, { mode: 0o600 });
  console.log(".env file has been created with the following content:");
  console.log(envContent);

  rl.close();
})();

rl.on("close", () => {
  process.exit(0);
});
