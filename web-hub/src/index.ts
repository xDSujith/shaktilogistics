import app from './app';
import { config } from './config';

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason instanceof Error ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

app.listen(config.port, () => {
  console.log(`Shakti Logistics Hub v0.2.0 — http://localhost:${config.port}`);
});
