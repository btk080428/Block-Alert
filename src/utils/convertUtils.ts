export function convertUnixTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

export function convertToAuthHeader(
  username: string,
  password: string
): Record<string, string> {
  const token = Buffer.from(`${username}:${password}`).toString("base64");
  return {
    Authorization: `Basic ${token}`,
  };
}
