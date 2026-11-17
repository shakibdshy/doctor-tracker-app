import { closeDb } from "@doctor-tracker-app/db";
import { toNodeHandler } from "better-auth/node";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { ok } from "./http/envelope";
import { errorHandler, notFoundHandler } from "./http/error-handler";
import v1Router from "./routes/v1";
import { ENV } from "./env.server";
import { auth } from "./services";

const PORT = ENV.PORT ?? 3000;

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: ENV.CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// better-auth handles its own body parsing; keep it ahead of express.json.
app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  ok(res, { status: "ok" });
});

app.use("/api/v1", v1Router);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down…`);
  // Do not wait indefinitely on keep-alive connections.
  const forcedExit = setTimeout(() => process.exit(1), 10_000);
  forcedExit.unref();
  server.close(async () => {
    try {
      await closeDb();
    } finally {
      process.exit(0);
    }
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
