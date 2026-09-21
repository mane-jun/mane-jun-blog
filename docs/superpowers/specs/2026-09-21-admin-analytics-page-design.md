# 관리자 전용 방문 통계 페이지 설계 (후속 작업)

> **상태: 미착수.** 2026-09-21에 1단계(관리자 화면의 "방문 통계 ↗" 버튼 → Cloudflare 대시보드)만 구현했다. 이 문서는 2단계를 나중에 바로 이어서 작업하기 위한 설계 메모다. 착수 전에 "미결정 사항"을 먼저 확정하고 구현 계획(`docs/superpowers/plans/`)을 작성한다.

## 목적

Cloudflare에 로그인하지 않고도, 블로그 관리자 화면에 GitHub로 로그인한 운영자가 휴대폰에서 방문 통계를 볼 수 있게 한다.

## 현재 상태 (1단계)

- 방문 수집: Cloudflare Web Analytics 비콘. `layouts/_partials/plugin/analytics.html`이 테마 파셜을 대체하고, 토큰은 `hugo.toml`의 `params.analytics.cloudflare.token`에 있다.
- 관리자 버튼: `static/admin/index.html`의 `#analytics-link`가 `https://dash.cloudflare.com/?to=/:account/web-analytics`를 새 탭으로 연다. 글 편집 화면(`#/…/entries/…`, `#/…/new`)에서는 숨긴다.
- 테스트: `tests/cms-config.test.js`가 버튼의 링크, `target`, `rel`을 검증한다.

## 범위

### 포함

- 관리자 전용 통계 페이지 `static/admin/stats.html`
- 기간 선택(최근 7일 / 30일)
- 일자별 방문 수·조회수, 글별 조회수 상위, 유입 경로 상위, 국가 상위
- 기존 OAuth Worker에 통계 조회 경로 추가

### 제외

- 실시간 통계, 개별 방문자 식별
- 방문자에게 보이는 조회수 표시
- Cloudflare 대시보드 수준의 세부 분석(페이지 로드 성능, Core Web Vitals 등)

## 구조

```text
stats.html (mane-jun.github.io/mane-jun-blog/admin/)
  │  localStorage "decap-cms-user"의 GitHub 토큰
  ▼
OAuth Worker  GET /stats?range=7d|30d   Authorization: Bearer <GitHub 토큰>
  │  1) GitHub API로 저장소 쓰기 권한 확인
  │  2) Cloudflare GraphQL Analytics API 조회 (CF API 토큰은 Worker Secret)
  ▼
집계된 JSON → stats.html이 표·그래프로 표시
```

- `stats.html`은 Decap 관리자 페이지와 같은 출처(origin)라서, Decap이 로그인 후 저장하는 `localStorage["decap-cms-user"]`(Decap 3.15.1 번들에서 키 이름 확인)의 GitHub 토큰을 읽을 수 있다. 토큰이 없으면 관리자 페이지에서 먼저 로그인하라고 안내한다.
- Decap 3.15.1에는 메뉴나 사용자 정의 페이지를 추가하는 API가 없다(`registerAdditionalLink` 없음). 그래서 별도 정적 페이지로 만들고, 1단계 버튼의 `href`를 `stats.html`(같은 탭)로 바꿔 연결한다.

## Worker `/stats` 경로

1. `Origin`이 `ALLOWED_ORIGIN`과 정확히 같을 때만 CORS를 허용한다. 사전 요청(`OPTIONS`)도 처리한다. 현재 Worker는 `GET` 외 메서드를 405로 거부하므로 이 부분을 확장해야 한다.
2. `Authorization: Bearer` 토큰이 없으면 401.
3. `GET https://api.github.com/repos/mane-jun/mane-jun-blog`를 그 토큰으로 호출하고, 응답의 `permissions.push`가 `true`가 아니면 403.
4. Cloudflare GraphQL API(`POST https://api.cloudflare.com/client/v4/graphql`)를 `CF_API_TOKEN`으로 호출한다.
5. 필요한 필드만 추려 JSON으로 반환한다. 업스트림 오류 본문, 토큰, 스택 트레이스는 응답에 넣지 않는다. 기존 `/callback`의 오류 처리 원칙과 같다.
6. 권한 확인 결과와 통계 응답은 짧게(예: 5분) 캐시해 API 호출을 줄인다. 사용자별 토큰이 섞이지 않도록 캐시 키를 설계한다.

### GraphQL 조회 (구현 시 스키마 재확인 필요)

데이터셋은 `rumPageloadEventsAdaptiveGroups`이고, 계정과 사이트로 필터링한다.

```graphql
query ($account: String!, $site: String!, $start: Date!, $end: Date!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      daily: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: $site, date_geq: $start, date_leq: $end }
        limit: 1000
        orderBy: [date_ASC]
      ) {
        count
        sum { visits }
        dimensions { date }
      }
      topPages: rumPageloadEventsAdaptiveGroups(
        filter: { siteTag: $site, date_geq: $start, date_leq: $end }
        limit: 10
        orderBy: [count_DESC]
      ) {
        count
        dimensions { requestPath }
      }
    }
  }
}
```

- 유입 경로는 `refererHost`, 국가는 `countryName` 차원으로 같은 방식의 그룹을 추가한다.
- `count`는 조회수, `sum.visits`는 방문 수다. 표본 추출·반올림된 값일 수 있으니 페이지에 "근사치"라고 표시한다.
- 봇 제외 필터(예: `bot: 0`)를 지원하는지 구현 시 확인한다.
- `requestPath`는 퍼센트 인코딩된 경로(`/mane-jun-blog/posts/…`)일 수 있으니 표시 전에 디코딩하고, 가능하면 글 제목으로 바꿔 보여준다.

## 설정과 비밀값

| 이름 | 종류 | 값 / 얻는 곳 |
| --- | --- | --- |
| `CF_API_TOKEN` | Secret | Cloudflare → My Profile → API Tokens에서 발급. 권한은 **Account Analytics: Read**만 (구현 시 필요한 최소 권한 재확인). |
| `CF_ACCOUNT_ID` | var | Cloudflare 대시보드 URL 또는 계정 홈의 Account ID |
| `CF_SITE_TAG` | var | Web Analytics 사이트 식별자. 비콘의 `token` 값과 **다르다.** 대시보드의 사이트 URL이나 `GET /accounts/{account_id}/rum/site_info/list` 응답에서 확인한다. |
| `GITHUB_REPO` | var | `mane-jun/mane-jun-blog` |

- `CF_API_TOKEN`은 기존 비밀값과 같은 방식으로 넣는다. Git에서 제외되는 `oauth-worker/.dev.vars.production`에 추가하고 `npm run deploy:oauth -- --secrets-file …`로 배포한 뒤 파일을 지운다. `wrangler.jsonc`의 `secrets.required`에도 추가한다.
- 기존 GitHub OAuth App의 `public_repo` 범위로 `GET /repos/{repo}`의 `permissions`를 읽을 수 있는지 구현 초기에 확인한다.

## 보안 고려사항

- GitHub 토큰은 우리 Worker로만 전송하고 URL 쿼리에 넣지 않는다(`Authorization` 헤더만 사용).
- CF API 토큰은 Worker 밖으로 나가지 않는다. 읽기 전용 최소 권한으로 발급한다.
- 저장소 쓰기 권한이 없는 GitHub 계정은 통계를 볼 수 없다. 방문 통계에는 개인정보가 없지만 운영자 전용 정보로 취급한다.
- `stats.html`에는 `noindex`를 넣고, 외부 스크립트를 쓰면 버전을 고정한다.

## 변경 예정 파일

- `oauth-worker/src/stats.js` (신규): 권한 확인, GraphQL 조회, 응답 정리
- `oauth-worker/src/index.js`: `/stats` 라우트, `OPTIONS`/CORS 처리
- `oauth-worker/test/stats.test.js` (신규)
- `oauth-worker/wrangler.jsonc`: vars, `secrets.required`
- `static/admin/stats.html` (신규)
- `static/admin/index.html`: `#analytics-link`의 `href`를 `stats.html`로, 새 탭 속성 제거
- `tests/cms-config.test.js`: 버튼 링크 기대값 변경
- `README.md`: 통계 페이지 사용법, CF API 토큰 발급 절차

## 검증 계획

- Worker 테스트: 토큰 없음 401, 쓰기 권한 없음 403, 허용되지 않은 Origin 거부, `OPTIONS` 사전 요청, GraphQL 오류 시 일반화된 오류, 정상 응답 형태, 비밀값 비노출
- `npm test` 전체 통과, Hugo 빌드 후 `public/admin/stats.html` 존재
- 배포 후: 로그인 상태에서 통계 표시, 로그아웃 상태 안내, 쓰기 권한 없는 계정 차단

## 미결정 사항

1. 그래프 방식: 라이브러리 없이 표와 CSS 막대로 할지, 버전을 고정한 차트 라이브러리를 쓸지
2. 기간 선택지: 7일 / 30일 외에 오늘·90일이 필요한지
3. 1단계 버튼을 없앨지, "Cloudflare에서 자세히 보기" 링크로 통계 페이지 안에 남길지
