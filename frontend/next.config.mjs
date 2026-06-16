/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a fully static site in `out/` for S3 + CloudFront hosting.
  output: "export",
  reactStrictMode: true,
  // Emit `route/index.html` files so clean URLs map predictably behind the
  // CloudFront URL-rewrite function.
  trailingSlash: true,
  // `next/image` optimization needs a server; static export must opt out.
  images: {
    unoptimized: true,
  },
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
