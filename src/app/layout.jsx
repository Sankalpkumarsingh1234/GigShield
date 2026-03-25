// src/app/layout.jsx
// REPLACE your existing layout.jsx with this one
// Wraps entire app in AuthProvider so all pages can use useAuth()

import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "GigShield — Income Protection for Delivery Partners",
  description: "AI-powered parametric insurance for Zomato & Swiggy delivery workers. Instant payouts when disruptions strike.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}