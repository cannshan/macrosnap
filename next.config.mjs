/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // The dev server refuses to serve /_next/* to any origin but localhost, which
  // silently breaks the app on a phone hitting it over the LAN: the HTML renders
  // but no client JS loads, so nothing is interactive. List the LAN hosts here.
  allowedDevOrigins: ["10.0.0.178", "10.0.0.54", "*.local"],
};

export default nextConfig;
