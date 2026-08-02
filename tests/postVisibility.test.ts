import { describe, expect, it } from 'vitest';
import { isPostVisible } from '../src/services/postVisibility';

describe('isPostVisible', () => {
  it('post de conta pública é visível pra qualquer autenticado, mesmo sem follow', () => {
    expect(
      isPostVisible({
        viewerId: 'viewer',
        authorId: 'author',
        authorIsPrivate: false,
        followStatus: null,
      })
    ).toBe(true);
  });

  it('post de conta privada é invisível pra quem não segue', () => {
    expect(
      isPostVisible({
        viewerId: 'viewer',
        authorId: 'author',
        authorIsPrivate: true,
        followStatus: null,
      })
    ).toBe(false);
  });

  it('post de conta privada é visível pra quem segue com status accepted', () => {
    expect(
      isPostVisible({
        viewerId: 'viewer',
        authorId: 'author',
        authorIsPrivate: true,
        followStatus: 'accepted',
      })
    ).toBe(true);
  });

  it('post de conta privada continua invisível pra follow pending', () => {
    expect(
      isPostVisible({
        viewerId: 'viewer',
        authorId: 'author',
        authorIsPrivate: true,
        followStatus: 'pending',
      })
    ).toBe(false);
  });

  it('o próprio autor sempre vê o post, mesmo privado e sem follow', () => {
    expect(
      isPostVisible({
        viewerId: 'author',
        authorId: 'author',
        authorIsPrivate: true,
        followStatus: null,
      })
    ).toBe(true);
  });
});
