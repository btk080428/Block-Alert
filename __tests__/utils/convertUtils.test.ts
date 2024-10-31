import {
  convertUnixTimestamp,
  convertToAuthHeader,
} from "../../src/utils/convertUtils";

describe("convertUnixTimestamp", () => {
  it("should convert unix timestamp to formatted date string", () => {
    expect(convertUnixTimestamp(1609459200)).toBe("2021/1/1 09:00");
    expect(convertUnixTimestamp(1625097600)).toBe("2021/7/1 09:00");
    expect(convertUnixTimestamp(1640995200)).toBe("2022/1/1 09:00");
  });
});

describe("convertToAuthHeader", () => {
  it("should return the correct Authorization header when given valid username and password", () => {
    const username = "user";
    const password = "pass";
    const expectedToken = Buffer.from(`${username}:${password}`).toString(
      "base64"
    );
    const expectedHeader = { Authorization: `Basic ${expectedToken}` };

    const result = convertToAuthHeader(username, password);

    expect(result).toEqual(expectedHeader);
  });
});
