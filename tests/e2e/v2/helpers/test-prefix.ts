import { randomUUID } from 'node:crypto';

export const TEST_PREFIX = `e2e-${Date.now()}-${randomUUID().slice(0, 8)}-`;
export const testEmail = (label: string) => `${TEST_PREFIX}${label}@test.local`;
