import { program } from 'commander';
import fs from 'fs';
import SteamPointsSender from './steamPointsSender.js';

program
  .option('--config <path>', 'Path to config file', 'config.json')
  .option('--full-auto', 'Run in automatic mode')
  .option('--quiet', 'Suppress logging');

program.parse(process.argv);
const opts = program.opts();
let config;
try {
  config = JSON.parse(fs.readFileSync(opts.config, 'utf8'));
} catch (err) {
  console.error('Failed to read config file', err);
  process.exit(1);
}

const log = opts.quiet ? { info(){}, warn(){}, error(){} } : console;

const sender = new SteamPointsSender(config, { log });

sender
  .run()
  .then((res) => {
    if (res.ok) {
      log.info('Operation completed');
    } else {
      log.error(`Failed: ${res.reason}`);
      process.exit(1);
    }
  })
  .catch((err) => {
    log.error('Unexpected error', err);
    process.exit(1);
  });
