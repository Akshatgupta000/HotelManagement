/**
 * Main entry point re-exporting app and server.
 * Allows backwards compatibility with node src/index.ts.
 */
import { app, server } from "./server";

export { app, server };
export default app;
