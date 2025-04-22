import "~/styles/globals.css";

// Шрифт
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Voice Analytics App",
  description: "An app for analyzing voice conversations.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

//корневой компонент
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
