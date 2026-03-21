import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map uploading logs during build
  silent: !process.env.CI,

  // Source maps configuration
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
