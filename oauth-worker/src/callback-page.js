const scriptEscapes = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  ' ': '\\u2028',
  ' ': '\\u2029',
};

// JSON literal that is safe to embed inside an inline <script> element.
const toScriptLiteral = (value) => JSON.stringify(value).replace(/[<>&  ]/gu, (character) => scriptEscapes[character]);

export function createCallbackPage({ status, payload, origin }) {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>GitHub 인증</title>
  </head>
  <body>
    <p>인증 결과를 관리자 화면으로 전달하는 중입니다…</p>
    <script>
      const targetOrigin = ${toScriptLiteral(origin)};
      const message = ${toScriptLiteral(message)};
      const receiveMessage = (event) => {
        if (event.origin !== targetOrigin) return;
        window.opener.postMessage(message, targetOrigin);
        window.removeEventListener('message', receiveMessage);
        window.close();
      };
      window.addEventListener('message', receiveMessage);
      window.opener.postMessage('authorizing:github', targetOrigin);
    </script>
  </body>
</html>
`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
