export function highlightText(
  text: string,
  color: "red" | "green" | "yellow" | "blue" | "cyan" | "magenta" = "cyan"
): string {
  const colors: Record<string, string> = {
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
  };

  const reset = "\x1b[0m";
  return `${colors[color]}${text}${reset}`;
}
