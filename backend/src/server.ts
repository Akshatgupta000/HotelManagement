import "dotenv/config";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import app from "./app";

// Environment Variables Validation - Core required variables
const coreRequiredEnvVars = [
  "MONGODB_CONNECTION_STRING",
  "JWT_SECRET_KEY",
];

const missingCoreEnvVars = coreRequiredEnvVars.filter(
  (envVar) => !process.env[envVar]
);

if (missingCoreEnvVars.length > 0) {
  console.error("❌ Missing required core environment variables:");
  missingCoreEnvVars.forEach((envVar) => console.error(`   - ${envVar}`));
  process.exit(1);
}

// Optional external services check (Cloudinary, Stripe)
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== "demo"
);

const hasStripe = Boolean(
  process.env.STRIPE_API_KEY &&
    !process.env.STRIPE_API_KEY.includes("placeholder")
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("☁️  Cloudinary configured successfully");
} else {
  console.warn(
    "⚠️  Cloudinary not configured or in demo mode. Falling back to local placeholder images."
  );
}

if (!hasStripe) {
  console.warn(
    "⚠️  Stripe API key is not configured or is a placeholder. Simulated payments are enabled for local testing."
  );
}

console.log("✅ Core environment variables verified");
console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "Not set"}`);

// MongoDB Connection
const connectDB = async () => {
  try {
    console.log("📡 Attempting to connect to MongoDB...");
    const uri = process.env.MONGODB_CONNECTION_STRING as string;
    const wantsTls =
      uri.includes("mongodb+srv://") ||
      /[?&]tls=true/i.test(uri) ||
      /[?&]ssl=true/i.test(uri);

    await mongoose.connect(uri, {
      ...(wantsTls
        ? {
            tls: true,
            tlsAllowInvalidCertificates: false,
          }
        : {}),
    });
    console.log("✅ MongoDB connected successfully");
    console.log(`📦 Database: ${mongoose.connection.db.databaseName}`);
    if (wantsTls) {
      console.log("🔒 MongoDB TLS enabled");
    }
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    console.error("💡 Please check your MONGODB_CONNECTION_STRING");
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
});

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB connection error:", error);
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected successfully");
});

connectDB();

const PORT = process.env.PORT || 5001;

const backendBaseUrl =
  process.env.BACKEND_URL?.replace(/\/$/, "") || `http://localhost:${PORT}`;

const server = app.listen(PORT, () => {
  console.log("🚀 ============================================");
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`🔗 Public: ${backendBaseUrl}`);
  console.log(`📚 API Docs: ${backendBaseUrl}/api-docs`);
  console.log(`💚 Health Check: ${backendBaseUrl}/api/health`);
  console.log("🚀 ============================================");
});

// Graceful Shutdown Handler
const gracefulShutdown = (signal: string) => {
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log("🔒 HTTP server closed");

    try {
      await mongoose.connection.close();
      console.log("🔒 MongoDB connection closed");
      console.log("✅ Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error("⚠️  Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});

export { app, server };

