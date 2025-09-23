import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // SECURITY: Never log sensitive endpoints or their responses
      if (capturedJsonResponse && !path.includes("/auth/")) {
        // Always exclude sensitive fields like tokens from logs
        const safeResponse = { ...capturedJsonResponse };
        delete safeResponse.token;
        delete safeResponse.password;
        
        // Only log non-empty, non-sensitive responses
        if (Object.keys(safeResponse).length > 0) {
          logLine += ` :: ${JSON.stringify(safeResponse)}`;
        }
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Attempt to seed the database with initial data
  try {
    await seedDatabase();
  } catch (error) {
    console.warn("Warning: Failed to seed database. Database may not be available.");
    console.warn("The application will continue to run but may have limited functionality.");
    console.warn("Error details:", error instanceof Error ? error.message : String(error));
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // SECURITY: Log error but don't crash the process
    log(`Error ${status}: ${message}`);
    console.error(err);

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    // Don't throw - this would crash the process
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
