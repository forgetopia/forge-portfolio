import { createMediaPolicy } from '../lib/media-policy';

/** Add only approved media-host origins. No external asset host is trusted by default. */
export const mediaPolicy = createMediaPolicy({
  trustedOrigins: [],
});
