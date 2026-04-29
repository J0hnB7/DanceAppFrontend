import { test as base, request } from '@playwright/test';
import { TEST_PREFIX } from '../helpers/test-prefix';

type TestFixtures = {
  autoCleanup: void;
};

export const test = base.extend<TestFixtures>({
  // eslint-disable-next-line no-empty-pattern
  autoCleanup: [async ({}, use) => {
    await use();
    const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
    await ctx.delete(`/api/v1/test/cleanup/${TEST_PREFIX}`);
    await ctx.dispose();
  }, { auto: true }],
});

export { expect } from '@playwright/test';
