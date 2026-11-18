import "./globals.css";

export const metadata = {
  title: "Movie & Course MCP Explorer",
  description:
    "Search Netflix titles, 2026 trending movies, and 100xEngineers lectures using MCP tools.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
