import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

export default defineCloudflareConfig({
  // No R2 cache by default to avoid binding errors if not set up
});
