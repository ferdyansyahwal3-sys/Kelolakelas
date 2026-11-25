/** @type {import('next').NextConfig} */
const nextConfig = {
  // Unggah bukti bayar (maks 5 MB) lewat server action; batas bawaan 1 MB.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
