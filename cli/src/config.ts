import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

const CONFIG_FILE = 'uniflow.config.yaml';

export const ConfigSchema = z.object({
  version: z.string().default('0.1'),
  region: z.string().default('us-east-1'),
  adminEmail: z.string().email(),
  retentionDays: z.number().int().min(1).default(90),
  connectors: z.array(z.string()).default(['webhook', 's3-export']),
  stackName: z.string().default('UnifowStack'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(cwd = process.cwd()): Config {
  const configPath = join(cwd, CONFIG_FILE);
  if (!existsSync(configPath)) {
    throw new Error(
      `No ${CONFIG_FILE} found. Run \`uniflow init\` to create one.`
    );
  }
  const raw = yaml.load(readFileSync(configPath, 'utf-8'));
  return ConfigSchema.parse(raw);
}

export function saveConfig(config: Config, cwd = process.cwd()): void {
  const configPath = join(cwd, CONFIG_FILE);
  writeFileSync(configPath, yaml.dump(config), 'utf-8');
}
