import "./globals.css";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "GigShield — Income Protection for Delivery Partners",
  description: "AI-powered parametric insurance for Zomato & Swiggy delivery workers. Instant payouts when disruptions strike.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
