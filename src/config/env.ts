import "dotenv/config";

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || "default_clinic_system_jwt_secret_change_in_production";

if (nodeEnv === "production") {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required in production");
  if (jwtSecret.length < 32 || jwtSecret === "default_clinic_system_jwt_secret_change_in_production") {
    throw new Error("JWT_SECRET must be a unique secret of at least 32 characters in production");
  }
}

export const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || "postgresql://clinic_user:local_dev_change_me@127.0.0.1:5432/clinic_db",
  jwtSecret,
  jwtExpiresIn: 60 * 60 * 24, // 24 hours
};
