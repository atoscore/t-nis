import { useEffect, useState } from 'react';
import { listMyCommunities, type CommunityRow } from '../services/communityService';

interface CommunityListProps {
  onCreateNew: () => void;
  onSearch: () => void;
  onOpen: (communityId: string) => void;
}

export default function CommunityList({ onCreateNew, onSearch, onOpen }: CommunityListProps) {
  const [communities, setCommunities] = useState<CommunityRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyCommunities()
      .then(setCommunities)
      .catch((cause: unknown) => setError(errorMessage(cause)));
  }, []);

  return (
    <main className="page">
      <h1>Comunidades</h1>

      <div className="option-row">
        <button type="button" className="primary" onClick={onCreateNew}>
          + Nova comunidade
        </button>
        <button type="button" className="toggle" onClick={onSearch}>
          Buscar comunidade
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {!communities && !error && <p>Carregando…</p>}

      {communities && communities.length === 0 && (
        <p className="feedback">
          Você ainda não participa de nenhuma comunidade. Crie uma ou busque uma
          existente para pedir entrada.
        </p>
      )}

      {communities && communities.length > 0 && (
        <ul className="community-list">
          {communities.map((community) => (
            <li key={community.id}>
              <button
                type="button"
                className="community-item"
                onClick={() => onOpen(community.id)}
              >
                {community.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Erro inesperado.';
}
