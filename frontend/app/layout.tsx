import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Poko — Planning poker for agile teams",
    template: "%s · Poko",
  },
  description:
    "Poko turns backlog refinement into a fast, honest round of planning poker. Blind voting, timeboxed rounds, and estimates that sync straight back to Jira, Linear and GitHub.",
  applicationName: "Poko",
  keywords: [
    "planning poker",
    "story points",
    "agile estimation",
    "backlog refinement",
    "scrum",
    "sprint planning",
  ],
  openGraph: {
    title: "Poko — Planning poker for agile teams",
    description:
      "Estimate as a team and agree in minutes. Blind voting, outlier detection, and two-way sync with your issue tracker.",
    siteName: "Poko",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
