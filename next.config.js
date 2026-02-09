/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Исключаем playwright из клиентской сборки
    config.externals = [
      ...(config.externals || []),
      ({ context, request }, callback) => {
        if (/playwright/.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      }
    ];
    return config;
  },
};

module.exports = nextConfig;