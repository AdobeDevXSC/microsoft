/* eslint-disable no-console */
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, consoleLogger, LogLevel } from '@adobe-commerce/aco-ts-sdk';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const BATCH_SIZE = 100;

export const createAcoClient = () => {
  config({ path: path.join(dirname, '.env') });

  const required = ['CLIENT_ID', 'CLIENT_SECRET', 'TENANT_ID', 'REGION', 'ENVIRONMENT'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')} (see .env.dist)`);
  }

  return createClient({
    credentials: {
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
    },
    tenantId: process.env.TENANT_ID,
    region: process.env.REGION,
    environment: process.env.ENVIRONMENT,
    logger: consoleLogger(LogLevel.INFO),
  });
};

export const readData = (file) => JSON.parse(fs.readFileSync(path.join(dirname, 'data', file), 'utf8'));

// Sends items in batches; returns false if any batch failed.
export const sendInBatches = async (label, items, send) => {
  let accepted = 0;
  let ok = true;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await send(batch);
      accepted += response.data?.acceptedCount || 0;
      console.info(`${label} batch ${batchNumber}:`, response.status, JSON.stringify(response.data));
    } catch (error) {
      ok = false;
      console.error(`${label} batch ${batchNumber} failed:`, error.message || error);
    }
  }
  console.info(`${label}: ${accepted} of ${items.length} accepted\n`);
  return ok;
};
