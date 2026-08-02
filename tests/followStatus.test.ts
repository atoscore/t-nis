import { describe, expect, it } from 'vitest';
import { decideFollowStatus } from '../src/services/followStatus';

describe('decideFollowStatus', () => {
  it('entra direto como accepted ao seguir uma conta pública', () => {
    expect(decideFollowStatus(false)).toBe('accepted');
  });

  it('fica pending ao seguir uma conta privada, até o followee responder', () => {
    expect(decideFollowStatus(true)).toBe('pending');
  });
});
