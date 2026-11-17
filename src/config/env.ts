import "dotenv/config";

export const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "postgresql://clinic_user:local_dev_change_me@127.0.0.1:5432/clinic_db",
  jwtSecret: process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || "default_clinic_system_jwt_secret_change_in_production",
  jwtExpiresIn: 60 * 60 * 24, // 24 hours
};
