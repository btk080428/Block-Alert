import {
  getEnvVariable,
  getOptionalEnvVariable,
  getCookieAuth,
} from "../utils/envUtils";

export const config = (() => {
  const cookiePath = getOptionalEnvVariable("NBXPLORER_COOKIE_PATH");
  let auth = null;

  if (cookiePath) {
    try {
      auth = getCookieAuth(cookiePath);
    } catch (error) {
      console.error(`Failed to parse NBXplorer cookie: ${error}`);
      auth = null;
    }
  }

  return {
    nbx: {
      nbxUrl: getEnvVariable("NBXPLORER_URL"),
      cryptoCode: "BTC",
      extendedPubKey: getEnvVariable("EXTENDED_PUBKEY"),
      balanceReportInterval: parseInt(
        getEnvVariable("BALANCE_REPORT_INTERVAL_MS"),
        10
      ),
      nbxUser: auth ? auth.username : null,
      nbxPassword: auth ? auth.password : null,
    },
    ntfy: {
      ntfyUrl: getEnvVariable("NTFY_URL"),
      topic: getEnvVariable("NTFY_TOPIC"),
      ntfyUser: getOptionalEnvVariable("NTFY_USER"),
      ntfyPassword: getOptionalEnvVariable("NTFY_PASSWORD"),
    },
  };
})();
