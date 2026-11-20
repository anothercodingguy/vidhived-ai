import { ApiError, getDocumentStatus } from '../lib/api'

// A minimal stand-in for the browser's Response object.
function fakeResponse(status: number, body: unknown, isJson = true) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (!isJson) throw new SyntaxError('Unexpected token < in JSON')
      return body
    },
  }
}

describe('lib/api request handling', () => {
  const realFetch = global.fetch

  afterEach(() => {
    global.fetch = realFetch
    jest.useRealTimers()
  })

  it('returns the parsed body on success', async () => {
    global.fetch = jest.fn().mockResolvedValue(fakeResponse(200, { documentId: 'd1', status: 'processing' })) as any

    await expect(getDocumentStatus('d1')).resolves.toEqual({ documentId: 'd1', status: 'processing' })
  })

  it('uses the server error message and status for a JSON error', async () => {
    global.fetch = jest.fn().mockResolvedValue(fakeResponse(404, { error: 'Document not found', code: 'NOT_FOUND' })) as any

    await expect(getDocumentStatus('nope')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'http',
      status: 404,
      code: 'NOT_FOUND',
      message: 'Document not found',
    })
  })

  it('gives a readable message when the error body is an HTML page, not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue(fakeResponse(502, '<html>Bad Gateway</html>', false)) as any

    const error = await getDocumentStatus('d1').catch(e => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(502)
    expect(error.message).toMatch(/not ready yet/)
  })

  it('reports a network failure in plain words', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as any

    await expect(getDocumentStatus('d1')).rejects.toMatchObject({ kind: 'network' })
  })

  it('gives up after the timeout', async () => {
    jest.useFakeTimers()
    // A request that never answers, and fails only when it is aborted (like the real fetch).
    global.fetch = jest.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    })) as any

    const pending = getDocumentStatus('d1', { timeoutMs: 5000 }).catch(e => e)
    jest.advanceTimersByTime(5000)
    const error = await pending

    expect(error).toBeInstanceOf(ApiError)
    expect(error.kind).toBe('timeout')
  })
})
