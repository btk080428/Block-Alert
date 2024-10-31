import {
  getEnvVariable,
  getOptionalEnvVariable,
  getCookieAuth,
} from "../../src/utils/envUtils";
import * as fs from "fs";

jest.mock("fs");

describe("getEnvVariable", () => {
  it("should return the environment variable", () => {
    process.env.TEST_KEY = "test_value";
    const result = getEnvVariable("TEST_KEY");
    expect(result).toBe("test_value");
  });
});

describe("getOptionalEnvVariable", () => {
  it("should return the environment variable if it is set", () => {
    process.env.TEST_KEY = "test_value";
    const result = getOptionalEnvVariable("TEST_KEY");
    expect(result).toBe("test_value");
  });

  it("should return null if the environment variable is not set", () => {
    const result = getOptionalEnvVariable("MISSING_KEY");
    expect(result).toBeNull();
  });
});

describe("getCookieAuth", () => {
  const mockFilePath = "/path/to/.cookie";

  beforeEach(() => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue("username:password");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return the correct username and password from the cookie file", () => {
    const result = getCookieAuth(mockFilePath);
    expect(result).toEqual({ username: "username", password: "password" });
  });

  it("should throw an error if the cookie file does not exist", () => {
    jest.spyOn(fs, "existsSync").mockReturnValue(false);
    expect(() => getCookieAuth(mockFilePath)).toThrow(
      `Cookie file not found at path: ${mockFilePath}`
    );
  });
});
