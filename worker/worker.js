export default {
  async fetch(request) {
    // Allow preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
        },
      });
    }

    const url = new URL(request.url);
    const code = url.pathname.slice(1); // e.g. /B057 -> B057

    if (!code || !/^[A-Z]\d+[A-Z]*$/i.test(code)) {
      return new Response('Bad request', { status: 400 });
    }

    const upstream =
      `https://www.nycgovparks.org/permits/field-and-court/issued/${code}/csv`;

    const resp = await fetch(upstream, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/csv,*/*',
        'Origin': 'https://www.nycgovparks.org',
        'Referer': 'https://www.nycgovparks.org/permits/field-and-court/map',
      },
    });

    const body = await resp.text();

    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': 'text/csv',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600',
      },
    });
  },
};
