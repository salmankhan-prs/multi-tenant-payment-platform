export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/payment-platform',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: '24h',
  },
  baseDomain: process.env.BASE_DOMAIN || 'localhost',
});
