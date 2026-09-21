# mane-jun's log

개발 기록, 일상, 생각을 남기는 개인 블로그. [Hugo](https://gohugo.io/) + [LoveIt](https://github.com/dillonzq/LoveIt) 테마로 만들었고, GitHub Actions로 GitHub Pages에 자동 배포됩니다.

- 사이트: https://mane-jun.github.io/mane-jun-blog/
- 로컬 경로: `D:\Projects\mane-jun-blog`

## 로컬에서 미리보기

```bash
cd D:\Projects\mane-jun-blog
hugo server -D
```

`http://localhost:1313` 접속. `-D`는 draft 글도 함께 보는 옵션.

## 새 글 쓰기

### 방법 1: 스크립트 사용 (권장)

```powershell
cd D:\Projects\mane-jun-blog
.\scripts\new-post.ps1
```

제목 → 카테고리 번호 선택 → 태그(선택) 순으로 입력하면 `content/posts/<슬러그>/index.md`에 front matter가 채워진 파일이 생성되고 에디터가 자동으로 열립니다.

### 방법 2: 직접 파일 생성

`content/posts/`에 `<슬러그>/index.md` 형태의 폴더를 만들고 아래처럼 작성합니다.

```yaml
---
title: "글 제목"
date: 2026-07-16T21:00:00+09:00
draft: false
categories: ["개발"]
tags: ["태그1", "태그2"]
summary: "목록에 보일 한 줄 요약"
---

본문 내용을 마크다운으로 작성합니다.
```

- `draft: false`여야 사이트에 노출됩니다. `draft: true`로 두면 비공개 초안으로 로컬에서만 보임(`hugo server -D`).
- 폴더명이 URL 슬러그가 됩니다 (예: `content/posts/my-post/index.md` → `/posts/my-post/`).
- 이미지를 추가할 땐 같은 폴더 안에 넣고 `![설명](파일명.png)`처럼 상대경로로 참조하세요. 글과 이미지가 한 폴더에 묶여 있어야 글을 옮기거나 지울 때 이미지도 함께 따라갑니다.

## 웹 관리자에서 글 쓰기

로컬 IDE 없이 브라우저(모바일 포함)에서 글을 쓰고 고칠 수 있습니다. [Decap CMS](https://decapcms.org/)를 사용합니다.

1. https://mane-jun.github.io/mane-jun-blog/admin/ 접속
2. **Login with GitHub** → GitHub 승인 화면에서 허용
3. 글 목록에서 새 글 작성 또는 기존 글 수정, 본문 편집기에서 이미지 업로드
4. **저장(Publish)** 을 누르면 `main` 브랜치에 바로 커밋되고, 기존 GitHub Actions가 자동으로 배포합니다 (1~2분).

회고 양식으로 쓰기:

- **빠른 추가 ▾ → 일간회고 / 주간회고 / 월간회고**를 누르면 제목·카테고리(회고)·태그·본문 양식이 채워진 새 글이 열립니다. 열 때 페이지가 한 번 새로 고쳐집니다.
  - 제목은 수정할 수 있고, 폴더명은 제목을 따릅니다(`2026-09-21-일간회고`, `2026-09-14~09-20-주간회고`, `2026-08-월간회고`).

    | 회고 | 제목 기본값 | 권장 시점 |
    | --- | --- | --- |
    | 일간 | 오늘 (`2026/09/21 일간회고`) | 자기 전 5~10분 |
    | 주간 | 일요일이면 이번 주, 월~토요일이면 지난주 (`2026/09/14~09/20 주간회고`) | 일요일 밤 15분 |
    | 월간 | 지난달 (`2026/08 월간회고`) | 다음 달 첫 주말 20~30분 |
  - 바쁜 날은 일간회고의 **오늘 체크(컨디션·운동)와 오늘 한 줄만** 써도 됩니다. 이틀 연속으로 빼먹지만 않으면 되고, 밀린 날은 채우지 말고 주간회고의 "회고 쓴 날 n/7"에만 반영합니다.
  - 왼쪽 컬렉션의 "일간회고", "주간회고", "월간회고"에서 회고 글만 모아 볼 수 있습니다(전체 "글" 목록에도 그대로 보임).
  - 양식을 바꾸려면 저장소 루트의 [일간회고_양식.md](일간회고_양식.md) / [주간회고_양식.md](주간회고_양식.md) / [월간회고_양식.md](월간회고_양식.md) 본문과 [static/admin/config.yml](static/admin/config.yml)의 본문 기본값을 **함께** 고치세요. 둘이 다르면 `npm test`가 알려줍니다.
- **같은 기간의 회고가 이미 있으면 새로 만들지 말고 목록에서 기존 글을 여세요.** 같은 제목으로 저장하면 기존 글을 덮어쓰지는 않지만, 기존 폴더 안에 `index-1.md`로 저장되어 사이트에 나오지 않습니다. (이름이 겹칠 때의 Decap 기본 동작이라 일반 "글"도 마찬가지입니다.)

동작 규칙:

- 새 글은 `content/posts/YYYY-MM-DD-제목/index.md`에 만들어지고, 업로드한 이미지는 같은 폴더에 저장되어 본문에서 상대경로로 참조됩니다. 기존 글 구조와 같습니다.
- **새 글은 항상 초안(`draft: true`)으로 시작합니다.** 저장해도 사이트에는 안 보입니다. 공개하려면 편집 화면의 **초안** 스위치를 끄고 다시 저장하세요.
- 초안 저장도 `main`에 커밋되므로 이력은 남지만, 배포 결과에는 포함되지 않습니다. 검토용 브랜치나 PR 단계는 없습니다.
- 작성일은 `2026-09-21T16:44:00+09:00`처럼 한국 시간(`+09:00`) 형식으로 저장됩니다. 파일을 직접 고칠 때도 이 형식을 지켜야 관리자 화면의 날짜순 정렬이 맞습니다(`…Z` 형식이 섞이면 정렬이 어긋남). VS Code의 Front Matter CMS도 [frontmatter.json](frontmatter.json)에서 같은 형식으로 저장하도록 설정되어 있습니다.
- 작성일은 기본값이 현재 시각입니다. **미래 시각으로 바꾸면 Hugo가 빌드에서 제외**하므로 발행하려는 글은 과거 시각으로 두세요.
- 글 삭제도 관리자 화면에서 할 수 있고, 삭제 역시 바로 커밋·배포됩니다. 단, **글을 지워도 그 글의 이미지는 지워지지 않고 사이트에 계속 공개됩니다.** 이미지가 있는 글은 먼저 편집 화면에서 이미지 선택 창을 열어 이 글의 이미지를 고르고 **선택항목 삭제**로 지운 뒤 글을 삭제하세요. 이미 글을 지웠다면 GitHub 저장소에서 남은 이미지 폴더를 지우면 됩니다. `npm test`를 실행하면 이미지만 남은 폴더를 찾아줍니다.
- 글 목록 화면 오른쪽 아래의 **방문 통계 ↗** 버튼을 누르면 Cloudflare Web Analytics가 새 탭으로 열립니다(Cloudflare 로그인 필요). 날짜별 방문자, 글별 조회수, 유입 경로, 국가를 볼 수 있습니다. 관리자 화면 안에서 바로 보는 통계 페이지는 [후속 작업 설계](docs/superpowers/specs/2026-09-21-admin-analytics-page-design.md)에 정리되어 있습니다.
- 이 저장소에 쓰기 권한이 있는 GitHub 계정만 저장할 수 있습니다. 관리자 페이지 자체는 누구나 열 수 있지만 권한이 없으면 아무것도 바꿀 수 없습니다.

> **권한 범위 주의:** 로그인 시 요청하는 GitHub OAuth 권한은 `public_repo`입니다. 이 권한은 이 저장소 하나가 아니라 **로그인한 계정이 쓸 수 있는 모든 공개 저장소**에 적용됩니다. CMS 설정이 대상 저장소와 `main` 브랜치를 고정하지만, 발급된 토큰 자체는 저장소 단위로 제한되지 않습니다. 공용 PC에서는 사용 후 로그아웃하고, 필요하면 GitHub Settings → Applications → Authorized OAuth Apps에서 승인을 취소하세요.

### 최초 1회 설정 (GitHub OAuth App + Cloudflare Worker)

GitHub 로그인은 Cloudflare Worker(`oauth-worker/`)가 중계합니다. Worker는 GitHub OAuth 코드를 토큰으로 교환해 관리자 화면에 전달만 하고, 아무것도 저장하지 않습니다.

**1. 도구 설치 및 Cloudflare 로그인**

```powershell
npm install
npx wrangler login
npx wrangler whoami
```

Worker 주소는 `https://mane-jun-blog-oauth.<workers-서브도메인>.workers.dev` 형태입니다. `<workers-서브도메인>`은 Cloudflare 대시보드 → Workers & Pages 화면에서 확인할 수 있습니다. 아래에서 이 주소를 **끝의 `/` 없이** 그대로 사용합니다.

**2. GitHub OAuth App 만들기**

GitHub → Settings → Developer settings → OAuth Apps → **New OAuth App**

- Application name: `mane-jun blog CMS`
- Homepage URL: Worker 주소 (예: `https://mane-jun-blog-oauth.<workers-서브도메인>.workers.dev`)
- Authorization callback URL (화면에 따라 **Redirect URLs**): Worker 주소 + `/callback` 하나만 등록하고, 와일드카드 매칭은 끈 상태로 둡니다.

생성 후 Client ID를 복사하고 **Generate a new client secret**으로 Client Secret을 발급받습니다.

**3. 비밀값 파일 만들기 (Git에 올라가지 않음)**

state 서명용 무작위 값을 생성합니다.

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

`oauth-worker/.dev.vars.production` 파일을 만들고 아래 형식으로 채웁니다.

```dotenv
GITHUB_OAUTH_ID=the-value-issued-by-github
GITHUB_OAUTH_SECRET=the-value-issued-by-github
OAUTH_STATE_SECRET=the-random-value-generated-locally
```

이 파일이 무시 대상인지 확인합니다 (`/oauth-worker/.dev.vars*` 규칙이 출력돼야 함).

```powershell
git check-ignore -v oauth-worker/.dev.vars.production
```

> 실제 값은 README, `wrangler.jsonc`, 채팅, 이슈, Git 커밋 어디에도 붙여넣지 마세요.

**4. Worker 배포**

```powershell
npm run deploy:oauth -- --secrets-file oauth-worker/.dev.vars.production
```

배포 후 Worker 주소에 접속해 `Decap OAuth proxy is running.`이 보이면 정상입니다. 배포가 끝나면 `oauth-worker/.dev.vars.production` 파일은 지웁니다 (비밀값은 Cloudflare에 저장되어 있음).

**5. CMS를 Worker에 연결**

[`static/admin/config.yml`](static/admin/config.yml)의 `backend.base_url`을 Worker 주소로 바꾸고 커밋·push합니다.

```yaml
backend:
  base_url: https://mane-jun-blog-oauth.<workers-서브도메인>.workers.dev
```

배포가 끝나면 관리자 URL에서 GitHub 로그인이 동작합니다.

Worker 코드나 CMS 설정을 고친 뒤에는 `npm test`로 테스트를 돌릴 수 있습니다.

## 카테고리 / 태그

별도 등록 없이 front matter에 쓰기만 하면 자동으로 생성됩니다.

```yaml
categories: ["개발"]   # 개발 / 회고 / 생각 (필요하면 새 카테고리도 자유롭게 추가 가능, 예: "기타")
tags: ["언리얼엔진", "리버싱"]
```

`/categories/`, `/tags/` 메뉴에서 자동으로 모아서 보여줍니다.

## 글/카테고리/태그 수정

기존 글의 내용, 카테고리, 태그를 바꾸고 싶으면 해당 `.md` 파일을 열어 직접 수정하면 됩니다. 별도 "재등록" 절차 없이 다음 배포 때 반영됩니다.

## 배포하기

`main` 브랜치에 push하면 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)이 자동으로 Hugo 빌드 후 GitHub Pages에 배포합니다.

```bash
git add .
git commit -m "커밋 메시지"
git push
```

배포 진행 상황: https://github.com/mane-jun/mane-jun-blog/actions

> GitHub Pages 최초 설정 시 Settings → Pages → Source를 **"GitHub Actions"**로 지정해야 워크플로가 정상 동작합니다.

## 프로젝트 구조

```
mane-jun-blog/
├── .github/workflows/deploy.yml   # GitHub Pages 자동 배포
├── archetypes/                    # hugo new content 시 기본 템플릿
├── content/
│   ├── about.md                   # 소개 페이지
│   └── posts/                     # 모든 글 (글마다 <슬러그>/index.md + 이미지 폴더)
├── oauth-worker/                  # 웹 관리자 GitHub 로그인용 Cloudflare Worker
├── scripts/
│   └── new-post.ps1               # 새 글 작성 도우미 스크립트
├── static/admin/                  # 웹 관리자 (Decap CMS) 페이지와 설정
├── tests/                         # CMS 설정·비밀값 점검 테스트 (npm test)
├── themes/LoveIt/                  # 테마 (git submodule)
└── hugo.toml                      # 사이트 설정
```

검색은 별도 페이지 없이 헤더의 검색 아이콘(LoveIt 내장 fuse.js 검색)으로 제공됩니다.

## 테마 업데이트

LoveIt은 git submodule이라 별도로 업데이트해야 합니다.

```bash
git submodule update --remote --merge
git add themes/LoveIt
git commit -m "LoveIt 테마 업데이트"
git push
```

## 참고 사항

- 이 저장소는 **퍼블릭**이어야 합니다. GitHub Pages는 GitHub Free 플랜에서 프라이빗 저장소는 지원하지 않습니다.
- `scripts/new-post.ps1`을 실행하는 콘솔(특히 구형 Windows PowerShell 콘솔)에서 한글이 깨진다면, Windows Terminal 사용을 권장합니다.
