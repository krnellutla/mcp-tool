import "./globals.css";

export const metadata = {
  title: "Netflix & 2026 Movies MCP Explorer",
  description: "Search Netflix titles and 2026 trending movies using MCP tools.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
