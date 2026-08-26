import { describe, it, expect, vi, beforeEach } from 'vitest';

const { updateMock, eqMock, fromMock } = vi.hoisted(() => {
  return {
    updateMock: vi.fn(),
    eqMock: vi.fn(() => Promise.resolve({ error: null as { message: string } | null })),
    fromMock: vi.fn()
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleSupabaseClient: () => ({ from: fromMock })
}));

fromMock.mockReturnValue({ update: updateMock });
updateMock.mockReturnValue({ eq: eqMock });

import { POST } from './route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/request-proposal', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  updateMock.mockReturnValue({ eq: eqMock });
  eqMock.mockResolvedValue({ error: null });
});

describe('POST /api/request-proposal', () => {
  it('rejects a request without a valid id', async () => {
    const response = await POST(makeRequest({ id: '' }));
    expect(response.status).toBe(400);
  });

  it('marks the assessment as proposal requested', async () => {
    const response = await POST(makeRequest({ id: 'abc-123' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({ proposal_requested: true });
    expect(eqMock).toHaveBeenCalledWith('id', 'abc-123');
  });

  it('returns 500 when the update fails', async () => {
    eqMock.mockResolvedValue({ error: { message: 'db down' } });

    const response = await POST(makeRequest({ id: 'abc-123' }));
    expect(response.status).toBe(500);
  });
});
