/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    // keep visited / prefetched screens in the client router cache so going back to a tab is instant
    staleTimes: { dynamic: 120, static: 600 },
  },
};
