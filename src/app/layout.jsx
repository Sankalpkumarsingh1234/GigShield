export const metadata = {
  title: "GigShield — Income Protection for Delivery Partners",
  description: "AI-powered parametric insurance for Zomato & Swiggy delivery workers. Instant payouts when disruptions strike.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
