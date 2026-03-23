import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockBuildPropertiesPayload, mockUpdatePageProperties } = vi.hoisted(
  () => ({
    mockBuildPropertiesPayload: vi.fn().mockReturnValue({}),
    mockUpdatePageProperties: vi.fn().mockResolvedValue({
      object: 'page',
      id: 'page-id',
    }),
  }),
);

vi.mock('../../src/config/token.js', () => ({
  resolveToken: vi
    .fn()
    .mockResolvedValue({ token: 'test-token', source: 'env' }),
}));

vi.mock('../../src/output/stderr.js', () => ({
  reportTokenSource: vi.fn(),
}));

vi.mock('../../src/notion/client.js', () => ({
  createNotionClient: vi.fn(() => ({
    pages: {
      retrieve: vi.fn().mockResolvedValue({
        object: 'page',
        id: 'page-id',
        properties: {
          Name: { type: 'title' },
        },
      }),
    },
  })),
}));

vi.mock('../../src/services/update.service.js', () => ({
  buildPropertiesPayload: mockBuildPropertiesPayload,
  updatePageProperties: mockUpdatePageProperties,
}));

import { updateCommand } from '../../src/commands/update.js';

describe('updateCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('allows --title "" to clear the title instead of erroring', async () => {
    const cmd = updateCommand();
    await cmd.parseAsync([
      'node',
      'test',
      'b55c9c91384d452b81dbd1ef79372b75',
      '--title',
      '',
    ]);

    // Should NOT have exited with error
    expect(exitSpy).not.toHaveBeenCalled();
    // Should have called updatePageProperties (meaning it got past the guard)
    expect(mockUpdatePageProperties).toHaveBeenCalled();
  });

  it('errors when neither --title nor --prop is provided', async () => {
    const cmd = updateCommand();
    await cmd.parseAsync(['node', 'test', 'b55c9c91384d452b81dbd1ef79372b75']);

    // Should have exited with error
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('No properties to update'),
    );
  });
});
