import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

const stsMock = mockClient(STSClient);

const mockInquirerPrompt = vi.fn();
const mockSaveConfig = vi.fn();
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

vi.mock('inquirer', () => ({ default: { prompt: mockInquirerPrompt } }));
vi.mock('../config.js', () => ({ saveConfig: mockSaveConfig }));
vi.mock('chalk', () => ({
  default: {
    bold: (s: string) => s,
    green: (s: string) => s,
    cyan: (s: string) => s,
    dim: (s: string) => s,
    yellow: (s: string) => s,
  },
}));

describe('init command — AWS credentials validation', () => {
  beforeEach(() => {
    stsMock.reset();
    vi.clearAllMocks();
    mockInquirerPrompt.mockResolvedValue({
      region: 'us-east-1',
      adminEmail: 'admin@test.com',
      retentionDays: 90,
      connectors: ['webhook'],
      stackName: 'UnifowStack',
    });
  });

  it('displays AWS account info when credentials are valid', async () => {
    stsMock.on(GetCallerIdentityCommand).resolves({
      Account: '123456789012',
      Arn: 'arn:aws:iam::123456789012:user/admin',
      UserId: 'AIDEXAMPLE',
    });

    const { initCommand } = await import('./init.js');
    await initCommand.parseAsync(['node', 'init']);

    expect(mockSaveConfig).toHaveBeenCalled();
    const logs = consoleSpy.mock.calls.map((c) => c[0]);
    expect(logs.some((l: string) => l.includes('AWS credentials valid'))).toBe(true);
    expect(logs.some((l: string) => l.includes('123456789012'))).toBe(true);
  });

  it('shows warning when AWS credentials are invalid', async () => {
    stsMock.on(GetCallerIdentityCommand).rejects(new Error('Invalid credentials'));

    const { initCommand } = await import('./init.js');
    await initCommand.parseAsync(['node', 'init']);

    expect(mockSaveConfig).toHaveBeenCalled();
    const logs = consoleSpy.mock.calls.map((c) => c[0]);
    expect(logs.some((l: string) => l.includes('Could not validate AWS credentials'))).toBe(true);
  });

  it('saves config before validating credentials', async () => {
    let configSavedBeforeSts = false;
    mockSaveConfig.mockImplementation(() => {
      configSavedBeforeSts = true;
    });
    stsMock.on(GetCallerIdentityCommand).callsFake(() => {
      if (!configSavedBeforeSts) throw new Error('STS called before saveConfig');
      return { Account: '123456789012' };
    });

    const { initCommand } = await import('./init.js');
    await initCommand.parseAsync(['node', 'init']);

    expect(configSavedBeforeSts).toBe(true);
  });
});
