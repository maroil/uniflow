import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

const cfnMock = mockClient(CloudFormationClient);

// Mock dependencies before importing the module under test
const mockExecSync = vi.fn();
const mockInquirerPrompt = vi.fn();
const mockLoadConfig = vi.fn();
const mockRunMigrations = vi.fn();
const mockOra = vi.fn(() => ({
  start: vi.fn().mockReturnThis(),
  succeed: vi.fn(),
  fail: vi.fn(),
}));

vi.mock('child_process', () => ({ execSync: mockExecSync }));
vi.mock('inquirer', () => ({ default: { prompt: mockInquirerPrompt } }));
vi.mock('../config.js', () => ({ loadConfig: mockLoadConfig }));
vi.mock('../migrations/runner.js', () => ({ runMigrations: mockRunMigrations }));
vi.mock('ora', () => ({ default: mockOra }));
vi.mock('chalk', () => ({
  default: {
    bold: (s: string) => s,
    green: (s: string) => s,
    cyan: (s: string) => s,
  },
}));

describe('deploy command — CDK bootstrap check', () => {
  beforeEach(() => {
    cfnMock.reset();
    vi.clearAllMocks();
    mockLoadConfig.mockReturnValue({
      region: 'us-east-1',
      stackName: 'UnifowStack',
      adminEmail: 'admin@test.com',
      retentionDays: 90,
    });
    mockRunMigrations.mockResolvedValue(undefined);
    // Prevent the CDK deploy execSync from actually running
    mockExecSync.mockReturnValue(undefined);
  });

  it('skips bootstrap prompt when CDKToolkit stack exists', async () => {
    cfnMock.on(DescribeStacksCommand).resolves({
      Stacks: [{ StackName: 'CDKToolkit', StackStatus: 'CREATE_COMPLETE', CreationTime: new Date() }],
    });

    const { deployCommand } = await import('./deploy.js');
    await deployCommand.parseAsync(['node', 'deploy']);

    expect(mockInquirerPrompt).not.toHaveBeenCalled();
  });

  it('prompts to bootstrap when CDKToolkit stack does not exist', async () => {
    const err = new Error('Stack with id CDKToolkit does not exist');
    err.name = 'ValidationError';
    cfnMock.on(DescribeStacksCommand).rejects(err);
    mockInquirerPrompt.mockResolvedValue({ shouldBootstrap: false });

    const { deployCommand } = await import('./deploy.js');
    await deployCommand.parseAsync(['node', 'deploy']);

    expect(mockInquirerPrompt).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'confirm',
          name: 'shouldBootstrap',
        }),
      ]),
    );
  });

  it('runs cdk bootstrap when user confirms', async () => {
    const err = new Error('Stack with id CDKToolkit does not exist');
    err.name = 'ValidationError';
    cfnMock.on(DescribeStacksCommand).rejects(err);
    mockInquirerPrompt.mockResolvedValue({ shouldBootstrap: true });

    const { deployCommand } = await import('./deploy.js');
    await deployCommand.parseAsync(['node', 'deploy']);

    expect(mockExecSync).toHaveBeenCalledWith('npx cdk bootstrap', { stdio: 'inherit' });
  });

  it('skips cdk bootstrap when user declines', async () => {
    const err = new Error('Stack with id CDKToolkit does not exist');
    err.name = 'ValidationError';
    cfnMock.on(DescribeStacksCommand).rejects(err);
    mockInquirerPrompt.mockResolvedValue({ shouldBootstrap: false });

    const { deployCommand } = await import('./deploy.js');
    await deployCommand.parseAsync(['node', 'deploy']);

    // execSync should only be called for cdk deploy, not bootstrap
    expect(mockExecSync).not.toHaveBeenCalledWith('npx cdk bootstrap', expect.anything());
  });
});
