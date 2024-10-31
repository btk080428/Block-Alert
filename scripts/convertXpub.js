const readline = require("readline");
const bs58check = require("bs58check");

const VERSIONS = {
  xpub: "0488b21e",
  ypub: "049d7cb2",
  zpub: "04b24746",
  tpub: "043587cf",
  upub: "044a5262",
  vpub: "045f1cf6",
};

function getPrefixTypeFromVersion(version) {
  return (
    Object.entries(VERSIONS).find(([, val]) => val === version)?.[0] || null
  );
}

function getNewVersionForConversion(prefixType) {
  switch (prefixType) {
    case "ypub":
    case "zpub":
      return VERSIONS.xpub;
    case "upub":
    case "vpub":
      return VERSIONS.tpub;
    default:
      return null;
  }
}

function convertExtendedPublicKey(extendedPubKey) {
  const decodedData = bs58check.default.decode(extendedPubKey);
  const version = Buffer.from(decodedData.slice(0, 4)).toString("hex");

  const prefixType = getPrefixTypeFromVersion(version);
  if (!prefixType) {
    throw new Error("Unknown extended public key version");
  }

  const newVersion = getNewVersionForConversion(prefixType);
  if (!newVersion) {
    return extendedPubKey;
  }

  const convertedData = Buffer.concat([
    Buffer.from(newVersion, "hex"),
    decodedData.slice(4),
  ]);
  return bs58check.default.encode(convertedData);
}

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
  let EXTENDED_PUBKEY;
  while (true) {
    try {
      EXTENDED_PUBKEY = await askQuestion(
        "Please enter the extended public key:\n"
      );
      const convertedKey = convertExtendedPublicKey(EXTENDED_PUBKEY);
      console.log(`Converted extended public key: ${convertedKey}`);
      break;
    } catch (error) {
      console.log(error);
      console.log(
        "Invalid extended public key format. Please enter a valid key."
      );
    }
  }

  rl.close();
})();

rl.on("close", () => {
  process.exit(0);
});
