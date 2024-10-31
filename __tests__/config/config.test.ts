import * as envUtils from "../../src/utils/envUtils";

jest.mock("../../src/utils/envUtils");

describe("config", () => {
  const mockEnvUtils = envUtils as jest.Mocked<typeof envUtils>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockEnvUtils.getEnvVariable.mockImplementation((key: string) => {
      const env: { [key: string]: string } = {
        NBXPLORER_URL: "http://127.0.0.1:24444",
        CRYPTO_CODE: "BTC",
        EXTENDED_PUBKEY: "xpub1",
        BALANCE_REPORT_INTERVAL_MS: "600000",
        NTFY_URL: "http://127.0.0.1:80",
        NTFY_TOPIC: "notifications",
      };

      return env[key];
    });
  });

  it("should load all required environment variables", () => {
    mockEnvUtils.getOptionalEnvVariable.mockReturnValue(null);

    jest.isolateModules(() => {
      const { config } = require("../../src/config/config");
      expect(config).toEqual({
        nbx: {
          nbxUrl: "http://127.0.0.1:24444",
          cryptoCode: "BTC",
          extendedPubKey: "xpub1",
          balanceReportInterval: 600000,
          nbxUser: null,
          nbxPassword: null,
        },
        ntfy: {
          ntfyUrl: "http://127.0.0.1:80",
          topic: "notifications",
          ntfyUser: null,
          ntfyPassword: null,
        },
      });
    });
  });

  it("should correctly load environment variables with cookie auth", () => {
    mockEnvUtils.getOptionalEnvVariable.mockImplementation((key: string) => {
      const optionalEnv: { [key: string]: string | null } = {
        NBXPLORER_COOKIE_PATH: "/path/to/cookie",
        NTFY_USER: "ntfyUser",
        NTFY_PASSWORD: "ntfyPass",
      };
      return optionalEnv[key];
    });

    mockEnvUtils.getCookieAuth.mockReturnValue({
      username: "nbxUser",
      password: "nbxPass",
    });

    jest.isolateModules(() => {
      const { config } = require("../../src/config/config");
      expect(config).toEqual({
        nbx: {
          nbxUrl: "http://127.0.0.1:24444",
          cryptoCode: "BTC",
          extendedPubKey: "xpub1",
          balanceReportInterval: 600000,
          nbxUser: "nbxUser",
          nbxPassword: "nbxPass",
        },
        ntfy: {
          ntfyUrl: "http://127.0.0.1:80",
          topic: "notifications",
          ntfyUser: "ntfyUser",
          ntfyPassword: "ntfyPass",
        },
      });
    });
  });

  it("should set nbxUser and nbxPassword to null if getCookieAuth fails", () => {
    mockEnvUtils.getOptionalEnvVariable.mockImplementation((key: string) => {
      const optionalEnv: { [key: string]: string | null } = {
        NBXPLORER_COOKIE_PATH: "/invalid/cookie",
        NTFY_USER: null,
        NTFY_PASSWORD: null,
      };
      return optionalEnv[key];
    });

    mockEnvUtils.getCookieAuth.mockImplementation(() => {
      throw new Error("Invalid cookie format");
    });

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    jest.isolateModules(() => {
      const { config } = require("../../src/config/config");
      expect(config).toEqual({
        nbx: {
          nbxUrl: "http://127.0.0.1:24444",
          cryptoCode: "BTC",
          extendedPubKey: "xpub1",
          balanceReportInterval: 600000,
          nbxUser: null,
          nbxPassword: null,
        },
        ntfy: {
          ntfyUrl: "http://127.0.0.1:80",
          topic: "notifications",
          ntfyUser: null,
          ntfyPassword: null,
        },
      });
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to parse NBXplorer cookie: Error: Invalid cookie format"
    );

    consoleErrorSpy.mockRestore();
  });

  it("should throw an error if a required environment variable is missing", () => {
    mockEnvUtils.getEnvVariable.mockImplementation((key: string) => {
      const env: { [key: string]: string } = {
        // NBXPLORER_URL is missing
        CRYPTO_CODE: "BTC",
        EXTENDED_PUBKEY: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKpXK5A5Qg",
        BALANCE_REPORT_INTERVAL_MS: "60000",
        NTFY_URL: "https://ntfy.example.com",
        NTFY_TOPIC: "notifications",
      };
      if (!env[key]) {
        throw new Error(
          `Environment variable "${key}" is not defined. Please ensure it is set in the .env file or the environment.`
        );
      }
      return env[key];
    });

    mockEnvUtils.getOptionalEnvVariable.mockReturnValue(null);

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      jest.isolateModules(() => {
        require("../../src/config/config");
      });
    }).toThrow(
      `Environment variable "NBXPLORER_URL" is not defined. Please ensure it is set in the .env file or the environment.`
    );

    consoleErrorSpy.mockRestore();
  });
});
