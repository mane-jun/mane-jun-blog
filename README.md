# mane-jun's log

개발 기록, 일상, 생각을 남기는 개인 블로그. [Hugo](https://gohugo.io/) + [LoveIt](https://github.com/dillonzq/LoveIt) 테마로 만들었습니다.

- 사이트: https://mane-jun.github.io/mane-jun-blog/
- 관리자: https://mane-jun.github.io/mane-jun-blog/admin/
- 방문 통계: https://mane-jun.github.io/mane-jun-blog/admin/stats.html

## 구성 한눈에 보기

| 무엇 | 어디서 | 설명 |
| --- | --- | --- |
| 블로그 + 관리자 페이지 | GitHub Pages | `main`에 push하면 GitHub Actions가 Hugo로 빌드해 배포 |
| 관리자 (글쓰기) | [Decap CMS](https://decapcms.org/) (`static/admin/`) | 브라우저에서 글을 쓰면 `main`에 바로 커밋 |
| 로그인 중계 + 통계 전달 | Cloudflare Worker (`oauth-worker/`) | GitHub 로그인 코드를 토큰으로 바꿔 전달(저장하는 것 없음), 관리자 통계 페이지에 Cloudflare 통계 전달 |
| 방문 수집 | Cloudflare Web Analytics | 모든 페이지의 비콘이 방문을 기록 |
| 댓글 | [Giscus](https://giscus.app) | 이 저장소의 GitHub Discussions에 저장 |
| 검색 | LoveIt 내장 (fuse.js) | 헤더의 검색 아이콘 |
| 최상위 주소 (`mane-jun.github.io`) | [mane-jun.github.io 저장소](https://github.com/mane-jun/mane-jun.github.io) | 블로그로 이동, 네이버 소유 확인, 최상위 `robots.txt`(사이트맵 위치) |
| 검색 노출 | Google Search Console, 네이버 서치어드바이저 | 사이트맵·RSS 제출 완료 |

## 웹 관리자에서 글 쓰기

로컬 IDE 없이 브라우저(모바일 포함)에서 글을 쓰고 고칠 수 있습니다.

1. [관리자 페이지](https://mane-jun.github.io/mane-jun-blog/admin/) 접속
2. **Login with GitHub** → GitHub 승인 화면에서 허용
3. 글 목록에서 새 글 작성 또는 기존 글 수정, 본문 편집기에서 이미지 업로드
4. **저장(Publish)** 을 누르면 `main` 브랜치에 바로 커밋되고 자동으로 배포됩니다 (1~2분).

### 소개 페이지 고치기

관리자 왼쪽의 **페이지 → 소개**에서 소개 페이지(`/about/`)를 고칠 수 있습니다. 저장하면 바로 배포됩니다.

### 블로그에서 바로 가기

이 브라우저에서 관리자에 로그인한 적이 있으면, 블로그 상단 메뉴(검색 아이콘 옆)에 **연필 아이콘**이 나타납니다. 글을 보는 중이면 **그 글의 편집 화면**으로, 다른 페이지에서는 관리자 첫 화면으로 갑니다. 모바일은 메뉴를 펼치면 "이 글 편집" / "관리자"로 보입니다.

- 방문자에게는 보이지 않습니다. 관리자 로그인 정보가 브라우저에 있을 때만 나타나고, 관리자에서 로그아웃하면 사라집니다.
- 새 기기에서는 아이콘이 없으니 [관리자 페이지](https://mane-jun.github.io/mane-jun-blog/admin/)에 한 번 로그인하세요.

### 미리보기

편집 화면 오른쪽 미리보기는 블로그 글처럼 보입니다. 제목, 날짜·카테고리·태그, 시리즈, 요약, 본문(블로그와 비슷한 제목·코드·인용 스타일)이 나오고, 초안이면 맨 위에 "초안" 표시가 붙습니다. 실제 사이트와 글꼴·여백이 조금 다를 수 있습니다. 코드는 [preview.js](static/admin/preview.js), [preview.css](static/admin/preview.css).

### 공개와 초안

- **새 글은 항상 초안(`draft: true`)으로 시작합니다.** 저장해도 사이트에는 안 보입니다. 공개하려면 편집 화면의 **초안** 스위치를 끄고 다시 저장하세요.
- 초안 저장도 `main`에 커밋되므로 이력은 남지만 배포 결과에는 포함되지 않습니다. 검토용 브랜치나 PR 단계는 없습니다.
- 작성일 기본값은 현재 시각입니다. **미래 시각으로 바꾸면 Hugo가 빌드에서 제외**하므로 발행하려는 글은 과거 시각으로 두세요.

### 양식으로 쓰기 (빠른 추가 ▾)

**빠른 추가 ▾**에서 양식을 고르면 카테고리·태그·본문이 채워진 새 글이 열립니다. 왼쪽 컬렉션에서 같은 이름을 누르면 해당 글만 모아 볼 수 있습니다(전체 "글" 목록에도 그대로 보임).

| 양식 | 카테고리 | 제목 | 폴더명 예 | 본문 |
| --- | --- | --- | --- | --- |
| 개발글 | 개발 | 직접 입력 | `2026-09-21-제목` | 한 줄 요약 · 배경 · 문제 · 원인 · 해결 · 배운 점 · 참고 자료 |
| 일간회고 | 회고 | 오늘 (`2026/09/21 일간회고`) | `2026-09-21-일간회고` | 오늘 체크(컨디션·운동) · 오늘 한 줄 · 한 일 · 잘한 것 · 아쉬운 것 · 내일 |
| 주간회고 | 회고 | 일요일이면 이번 주, 월~토요일이면 지난주 (`2026/09/14~09/20 주간회고`) | `2026-09-14~09-20-주간회고` | 이번 주 숫자 · 목표 점검 · 컨디션 흐름 · 습관 · 다음 주 목표 |
| 월간회고 | 회고 | 지난달 (`2026/08 월간회고`) | `2026-08-월간회고` | 이번 달 숫자 · 목표 점검 · 유지/그만/시도 · 다음 달 목표 |

- 회고 제목은 자동으로 채워지고(열 때 페이지가 한 번 새로 고쳐짐) 수정할 수 있습니다. 폴더명은 제목을 따릅니다.
- 권장 시점: 일간은 자기 전 5~10분, 주간은 일요일 밤 15분, 월간은 다음 달 첫 주말 20~30분.
- 바쁜 날은 일간회고의 **오늘 체크(컨디션·운동)와 오늘 한 줄만** 써도 됩니다. 이틀 연속으로 빼먹지만 않으면 되고, 밀린 날은 채우지 말고 주간회고의 "회고 쓴 날 n/7"에만 반영합니다.
- 매일 **밤 10시**까지 그날 일간회고가 공개되지 않았으면 GitHub 이슈로 알림이 옵니다([회고 알림](#회고-알림)).
- 일간회고의 `컨디션: /5`에 숫자를, `운동:`에 O 또는 X를 채우면 [회고 모아보기](#회고-모아보기)의 잔디 색과 숫자에 반영됩니다.
- 양식을 바꾸려면 저장소 루트의 양식 파일([개발글_양식.md](개발글_양식.md), [일간회고_양식.md](일간회고_양식.md), [주간회고_양식.md](주간회고_양식.md), [월간회고_양식.md](월간회고_양식.md)) 본문과 [static/admin/config.yml](static/admin/config.yml)의 본문 기본값을 **함께** 고치세요. 둘이 다르면 `npm test`가 알려줍니다.

### 시리즈

이어지는 글(예: 리버싱 입문 1편, 2편, …)은 일반 글·개발글 편집 화면의 **시리즈** 칸에 같은 이름을 쓰면 묶입니다(회고에는 칸이 없습니다). 파일로 쓸 때는 front matter에 `series: "리버싱 입문"`을 넣습니다.

- 글 본문 위에 시리즈 이름, 몇 번째 편인지(`2 / 3`), 전체 편 목록이, 본문 아래에 이전 편·다음 편 링크가 나옵니다.
- 편 순서는 **작성일 순**입니다. 순서를 바꾸려면 작성일을 조정하세요. 초안은 목록에 나오지 않습니다.
- 모든 시리즈는 `/series/` 페이지에서 볼 수 있습니다. 첫 시리즈를 쓰면 `hugo.toml`의 메뉴에 "시리즈"를 추가하면 좋습니다.

### 주의할 점

- **같은 제목(같은 폴더명)의 글이 이미 있으면 새로 만들지 말고 목록에서 기존 글을 여세요.** 같은 이름으로 저장하면 기존 글을 덮어쓰지는 않지만, 기존 폴더 안에 `index-1.md`로 저장되어 사이트에 나오지 않습니다. 회고뿐 아니라 일반 글도 마찬가지이고, **복제** 버튼으로 만든 글도 제목을 바꿔야 합니다.
- **글을 지워도 그 글의 이미지는 지워지지 않고 사이트에 계속 공개됩니다.** 이미지가 있는 글은 먼저 편집 화면에서 이미지 선택 창을 열어 이 글의 이미지를 고르고 **선택항목 삭제**로 지운 뒤 글을 삭제하세요. 이미 글을 지웠다면 GitHub 저장소에서 남은 이미지 폴더를 지우면 됩니다. `npm test`를 실행하면 이미지만 남은 폴더를 찾아줍니다.
- **글 주소(폴더명)를 바꾸면 그 글의 댓글 연결이 끊기고** 검색엔진에 등록된 주소도 무효가 됩니다.
- 작성일은 `2026-09-21T16:44:00+09:00`처럼 한국 시간(`+09:00`) 형식으로 저장됩니다. 파일을 직접 고칠 때도 이 형식을 지켜야 관리자 화면의 날짜순 정렬이 맞습니다(`…Z` 형식이 섞이면 정렬이 어긋남). VS Code의 Front Matter CMS도 [frontmatter.json](frontmatter.json)에서 같은 형식으로 저장하도록 설정되어 있습니다.
- 이 저장소에 쓰기 권한이 있는 GitHub 계정만 저장할 수 있습니다. 관리자 페이지 자체는 누구나 열 수 있지만 권한이 없으면 아무것도 바꿀 수 없습니다.

> **권한 범위 주의:** 로그인 시 요청하는 GitHub OAuth 권한은 `public_repo`입니다. 이 권한은 이 저장소 하나가 아니라 **로그인한 계정이 쓸 수 있는 모든 공개 저장소**에 적용됩니다. CMS 설정이 대상 저장소와 `main` 브랜치를 고정하지만, 발급된 토큰 자체는 저장소 단위로 제한되지 않습니다. 공용 PC에서는 사용 후 로그아웃하고, 필요하면 GitHub Settings → Applications → Authorized OAuth Apps에서 승인을 취소하세요.

## 로컬에서 글 쓰기

아래 명령은 모두 저장소 루트에서 실행합니다.

### 미리보기

```bash
hugo server -D
```

`http://localhost:1313/mane-jun-blog/` 접속. `-D`는 초안도 함께 보는 옵션입니다. 댓글은 배포 환경에서만 켜지므로, 댓글까지 보려면 `hugo server --environment production`으로 띄웁니다.

### 새 글 만들기

스크립트를 쓰면 제목 → 카테고리 번호 → 태그(선택) 순으로 입력받아 `content/posts/<슬러그>/index.md`를 만들고 에디터를 열어줍니다.

```powershell
.\scripts\new-post.ps1
```

직접 만들 때는 `content/posts/<슬러그>/index.md`를 만들고 아래처럼 작성합니다.

```yaml
---
title: "글 제목"
date: 2026-07-16T21:00:00+09:00
draft: false
categories: ["개발"]            # 개발 / 회고 / 생각 / 기타 (새 카테고리도 자유롭게 추가 가능)
tags: ["언리얼엔진", "리버싱"]
series: "리버싱 입문"           # 선택: 시리즈로 묶을 때
summary: "목록에 보일 한 줄 요약"
images: ["cover.png"]           # 선택: 링크 공유 썸네일
comment: false                  # 선택: 이 글만 댓글 끄기
---

본문 내용을 마크다운으로 작성합니다.
```

- `draft: false`여야 사이트에 노출됩니다. `draft: true`는 로컬(`hugo server -D`)에서만 보입니다.
- 폴더명이 URL이 됩니다 (예: `content/posts/my-post/index.md` → `/posts/my-post/`).
- 이미지는 같은 폴더에 넣고 `![설명](파일명.png)`처럼 상대경로로 참조하세요. 글과 이미지가 한 폴더에 묶여 있어야 글을 옮기거나 지울 때 이미지도 함께 따라갑니다.
- 카테고리와 태그는 별도 등록 없이 쓰기만 하면 자동으로 생기고 `/categories/`, `/tags/`에 모입니다.
- 기존 글의 내용·카테고리·태그는 해당 `index.md`를 직접 고치면 다음 배포 때 반영됩니다.

## 사이트 기능

### 홈 화면

홈의 글 목록에는 **일간회고가 나오지 않습니다.** 매일 쓰는 일간회고에 개발 글이 밀려나지 않도록 뺀 것이고, 일간회고는 [회고 모아보기](#회고-모아보기)·전체글·카테고리·태그 페이지와 RSS에는 그대로 나옵니다. 홈에서 뺄 태그는 [hugo.toml](hugo.toml)의 `[params.home.posts] excludeTags`에서 바꿉니다.

### 관련 글 추천

글 아래에 **이런 글도 있어요**로 비슷한 글을 최대 3개 보여줍니다. 시리즈 > 태그 > 카테고리 순으로 많이 겹치는 글이 먼저 나오고, 겹치는 게 적으면 나오지 않습니다(태그를 꼼꼼히 달수록 잘 연결됩니다).

- 일간회고는 추천하지 않고, 일간회고 글 아래에는 추천을 띄우지 않습니다. 같은 시리즈 글은 시리즈 목록에 이미 있으므로 뺍니다.
- 설정은 [hugo.toml](hugo.toml)의 `[related]`(점수)와 `[params.page.related]`(개수, 제외 태그)입니다.

### 회고 모아보기

상단 메뉴 **회고**(`/retro/`)에서 회고를 한눈에 봅니다.

- **잔디:** 최근 1년의 일간회고를 날짜별 칸으로 보여줍니다. 쓴 날은 초록색이고 컨디션이 좋을수록 진합니다(컨디션을 안 적은 날은 중간 색). 칸에 마우스를 올리면 날짜·컨디션·운동이 보이고, 누르면 그날 회고로 이동합니다.
- **숫자:** 연속 기록, 이번 달 쓴 날, 이번 달 평균 컨디션, 일간·주간·월간 회고 수. "오늘"은 보는 사람 브라우저의 한국 시간 기준입니다.
- **목록:** 주간회고·월간회고 링크.
- 날짜는 **제목**(`2026/09/21 일간회고`)에서 읽으므로, 자정이 지나 전날 회고를 써도 제목 날짜에 표시됩니다. 컨디션·운동은 본문의 `컨디션: 3/5`, `운동: O`(또는 `X`) 줄에서 읽습니다.

### 댓글

글 아래 댓글은 Giscus로 동작하며, 이 저장소의 GitHub Discussions(**Announcements** 카테고리)에 글마다 하나의 토론으로 저장됩니다. 첫 댓글이 달릴 때 토론이 자동으로 만들어지고, 댓글을 쓰려면 GitHub 로그인이 필요합니다.

- 새 댓글 알림은 GitHub 알림으로 옵니다.
- 댓글 삭제·숨기기·차단은 저장소의 Discussions 탭에서 합니다.
- 토론은 글 주소로 연결되므로 **글 주소를 바꾸면 기존 댓글과 연결이 끊깁니다.**
- 특정 글에서만 댓글을 끄려면 front matter에 `comment: false`를 넣습니다. 설정은 [hugo.toml](hugo.toml)의 `[params.page.comment.giscus]`에 있습니다.

### 사진

- 글 폴더에 올린 JPEG·PNG·WebP 사진은 빌드할 때 자동으로 **800 / 1200 / 1600px WebP**로 줄어들고, 화면에 맞는 크기가 쓰입니다. 휴대폰 사진의 회전 정보(EXIF)를 반영해 바로 세우고, 줄인 사진에는 촬영 위치 같은 EXIF가 남지 않습니다. 원본 크기 그대로 올려도 됩니다.
- 모든 사진은 **눌러서 크게 볼 수 있습니다**(확대·넘기기). `![설명](사진.jpg "캡션")`처럼 따옴표 안에 캡션을 쓰면 사진 아래와 크게 보기 화면에 나옵니다.
- GIF·SVG와 외부 주소의 이미지는 변환하지 않고 그대로 보여줍니다.
- **주의:** 원본 파일은 공개 저장소에 그대로 남고 사이트 폴더에도 복사되므로, 원본의 EXIF(촬영 위치 등)는 누구나 볼 수 있습니다. 위치가 드러나면 안 되는 사진은 휴대폰 카메라의 위치 태그를 끄거나 위치 정보를 지운 뒤 올리세요.
- 변환은 [render-image.html](layouts/_markup/render-image.html)이 하고, 변환 결과는 GitHub Actions가 캐시해 다음 배포에 재사용합니다.

### 공유 버튼과 링크 미리보기

- 글 아래에 X, Threads, Facebook, LinkedIn, **링크 복사** 버튼이 있습니다. 켜고 끄는 설정은 [hugo.toml](hugo.toml)의 `[params.page.share]`입니다.
- 링크를 메신저나 SNS에 붙이면 개구리 썸네일([static/images/og.jpg](static/images/og.jpg))이 뜹니다. 글마다 다르게 하려면 글 폴더의 이미지를 front matter `images: ["파일명.png"]`로 지정하거나, 파일 이름을 `cover.png`처럼 `cover`/`feature`/`thumbnail`로 시작하게 둡니다.
- 카카오톡·페이스북은 미리보기를 한동안 기억하므로 바뀐 썸네일이 바로 안 보일 수 있습니다. 카카오는 [공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 캐시를 지울 수 있습니다.
- 홈 화면의 프로필 사진은 [assets/images/avatar.jpg](assets/images/avatar.jpg), 브라우저 탭·홈 화면 아이콘은 `static/favicon*`, `static/apple-touch-icon.png`, `static/android-chrome-192x192.png`입니다.

## 운영

### 회고 알림

매일 22:00(KST)에 [retro-reminder.yml](.github/workflows/retro-reminder.yml)이 그날 일간회고를 확인합니다. 제목(`2026/09/21 일간회고`)이나 폴더명(`2026-09-21-일간회고`)으로 찾습니다.

- **없으면** "📝 2026-09-21 일간회고를 아직 안 썼어요" 이슈를, **초안이면** "…아직 초안이에요" 이슈를 만들어 `mane-jun`에게 지정합니다. 이슈에는 바로 쓰기/편집 링크가 있습니다.
- **GitHub 모바일 앱**을 설치하고 알림을 켜 두면 휴대폰으로 푸시가 옵니다(지정된 이슈는 기본으로 푸시 대상). 이메일 알림은 GitHub 알림 설정을 따릅니다.
- 회고를 공개해 저장하면 그날 알림 이슈가 자동으로 닫히고, 다음 알림 때 지난 날짜의 열린 알림도 닫힙니다.
- GitHub의 예약 실행은 붐비는 시간에 수십 분 늦어질 수 있습니다. 저장소에 60일 동안 커밋이 없으면 예약 실행이 멈추므로, 그때는 Actions 탭에서 다시 켜세요.
- 테스트: Actions → **Daily retrospective reminder** → **Run workflow**에서 날짜를 넣어 실행하면 그 날짜 기준으로 확인합니다.
- 판단 로직은 [retro-reminder.mjs](scripts/retro-reminder.mjs)이고 `npm test`로 검사합니다.

### 방문 통계

관리자 글 목록 화면 오른쪽 아래의 **방문 통계** 버튼을 누르면 통계 페이지가 열립니다. Cloudflare에 로그인하지 않아도, 관리자 페이지에 GitHub로 로그인한 상태면 휴대폰에서도 볼 수 있습니다.

- 최근 7일 / 30일의 조회수·방문 수, 일자별 조회수 막대, 많이 본 페이지(글 제목으로 표시), 유입 경로, 국가.
- 값은 Cloudflare Web Analytics 기준 근사치(봇 제외)이고, 날짜는 UTC 기준, 결과는 최대 5분 캐시됩니다.
- 이 저장소에 쓰기 권한이 있는 GitHub 계정만 볼 수 있습니다. 더 자세한 분석은 페이지 위의 **Cloudflare에서 자세히 보기 ↗**로 봅니다.
- 동작 방식: 통계 페이지가 관리자 로그인 토큰으로 Worker의 `/stats`를 부르고, Worker가 GitHub에서 쓰기 권한을 확인한 뒤 Cloudflare GraphQL API로 통계를 가져옵니다. Cloudflare API 토큰은 Worker 밖으로 나가지 않습니다.
- Cloudflare는 조회 기간이 길수록 표본을 듬성듬성 뽑아(30일을 한 번에 조회하면 약 12배) 숫자가 크게 틀어지므로, Worker가 7일씩 나눠 조회한 뒤 합칩니다.

### 검색 노출

- **Google Search Console:** `https://mane-jun.github.io/mane-jun-blog/`(URL 접두어 속성)로 등록했고, 소유 확인 태그는 [hugo.toml](hugo.toml)의 `[params.verification]`에 있습니다.
- **네이버 서치어드바이저:** 네이버는 호스트 단위만 받아서 `https://mane-jun.github.io`로 등록했고, 소유 확인 태그는 [mane-jun.github.io 저장소](https://github.com/mane-jun/mane-jun.github.io)의 `index.html`에 있습니다.
- 두 곳 모두 사이트맵 `https://mane-jun.github.io/mane-jun-blog/sitemap.xml`을 제출했고, 네이버에는 RSS `https://mane-jun.github.io/mane-jun-blog/index.xml`도 제출했습니다. 새 글은 사이트맵·RSS로 자동 수집되며, 빨리 노출하고 싶은 글만 Google **URL 검사** / 네이버 **웹 페이지 수집**에 요청하면 됩니다.
- 검색엔진은 도메인 최상위의 `robots.txt`만 읽으므로 사이트맵 위치는 [mane-jun.github.io 저장소](https://github.com/mane-jun/mane-jun.github.io)의 `robots.txt`가 알려줍니다. 이 저장소에 `mane-jun-blog` 폴더를 만들면 블로그 주소와 겹치니 만들지 마세요.

### 배포

`main` 브랜치에 push하면 [deploy.yml](.github/workflows/deploy.yml)이 Hugo로 빌드해 GitHub Pages에 배포합니다. 웹 관리자에서 저장한 글도 같은 경로로 배포됩니다.

```bash
git add .
git commit -m "커밋 메시지"
git push
```

배포 진행 상황: https://github.com/mane-jun/mane-jun-blog/actions

Worker(`oauth-worker/`)는 GitHub Pages와 따로 배포합니다. 코드나 [wrangler.jsonc](oauth-worker/wrangler.jsonc)를 고친 뒤에는 아래 명령을 실행하세요.

```bash
npm run deploy:oauth
```

### 테스트

```bash
npm test
```

CMS 설정과 글 양식·미리보기가 맞는지, 회고 알림이 오늘 회고를 제대로 찾는지, 이미지만 남은 폴더가 없는지, 로그인·통계 Worker가 제대로 동작하는지(권한 없는 계정 차단, 비밀값 비노출 포함) 확인합니다. CMS 설정이나 Worker 코드를 고친 뒤에 실행하세요.

## 개발 참고

### 프로젝트 구조

```
mane-jun-blog/
├── .github/workflows/
│   ├── deploy.yml                 # GitHub Pages 자동 배포
│   └── retro-reminder.yml         # 매일 22시 일간회고 알림
├── archetypes/                    # hugo new content 시 기본 템플릿
├── assets/
│   ├── css/_custom.scss           # 시리즈·회고 모아보기 스타일
│   └── images/avatar.jpg          # 홈 프로필 사진
├── content/
│   ├── about.md                   # 소개 페이지
│   ├── retro.md                   # 회고 모아보기 페이지
│   └── posts/                     # 모든 글 (글마다 <슬러그>/index.md + 이미지)
├── i18n/ko.toml                   # 테마에 없는 번역 ("시리즈"). 테마에 이미 있는 문구는 여기서 덮어써지지 않음
├── layouts/                       # 테마를 덮어쓰거나 추가한 템플릿 (아래 표)
├── oauth-worker/                  # 관리자 GitHub 로그인·방문 통계용 Cloudflare Worker
├── scripts/
│   ├── new-post.ps1               # 새 글 작성 도우미 스크립트
│   └── retro-reminder.mjs         # 오늘 일간회고 확인 (회고 알림 워크플로)
├── static/
│   ├── admin/                     # 관리자 (Decap CMS) 페이지·설정·미리보기, 통계 페이지
│   ├── images/og.jpg              # 링크 공유 기본 썸네일
│   └── favicon* 등                # 브라우저 탭·홈 화면 아이콘
├── tests/                         # CMS 설정·콘텐츠·비밀값 점검 테스트 (npm test)
├── themes/LoveIt/                 # 테마 (git submodule)
├── 개발글_양식.md                 # 개발 글 양식 원본
├── 일간·주간·월간회고_양식.md      # 회고 양식 원본
└── hugo.toml                      # 사이트 설정
```

### 테마를 고친 파일

| 파일 | 종류 | 하는 일 |
| --- | --- | --- |
| [layouts/home.html](layouts/home.html) | 테마 복사본 | 홈 글 목록에서 `excludeTags` 태그(일간회고) 글 제외 |
| [layouts/posts/single.html](layouts/posts/single.html) | 테마 복사본 | 글 페이지에 시리즈 목록(본문 위)·이전/다음 편·관련 글(본문 아래) 추가, 글자 수를 "N자"로 표시 |
| [layouts/_partials/head/link.html](layouts/_partials/head/link.html) | 테마 복사본 | 아이콘 경로를 `/mane-jun-blog/` 하위로, 네이버 인증 태그, 아래 두 스크립트 포함 |
| [layouts/_partials/plugin/share.html](layouts/_partials/plugin/share.html) | 테마 복사본 | 공유 버튼에 "링크 복사" 추가 |
| [layouts/_markup/render-image.html](layouts/_markup/render-image.html) | 대체 | 본문 사진을 WebP로 줄이고 회전 보정, 모든 사진을 크게 보기로 연결 |
| [layouts/_partials/plugin/analytics.html](layouts/_partials/plugin/analytics.html) | 대체 | Cloudflare Web Analytics 비콘만 사용 |
| [layouts/robots.txt](layouts/robots.txt) | 대체 | 올바른 사이트맵 주소 |
| [layouts/_partials/head/giscus-reactions-fix.html](layouts/_partials/head/giscus-reactions-fix.html) | 추가 | 테마가 다크/라이트 전환 때 댓글 반응(이모지) 버튼을 끄는 버그를 되돌림 |
| [layouts/_partials/head/admin-link.html](layouts/_partials/head/admin-link.html) | 추가 | 관리자에 로그인한 브라우저에서만 헤더에 관리자·글 편집 바로가기 표시 |
| [layouts/_partials/single/series.html](layouts/_partials/single/series.html), [series-nav.html](layouts/_partials/single/series-nav.html) | 추가 | 시리즈 목록, 이전/다음 편 |
| [layouts/_partials/single/related.html](layouts/_partials/single/related.html) | 추가 | 관련 글 추천 |
| [layouts/retro.html](layouts/retro.html) | 추가 | 회고 모아보기 페이지 |

### 테마 업데이트

LoveIt은 git submodule이라 별도로 업데이트해야 합니다. 위 표에서 **테마 복사본**인 파일은 업데이트 후 테마 원본의 변경 사항을 반영해야 할 수 있으니 원본과 비교해 보세요.

```bash
git submodule update --remote --merge
git add themes/LoveIt
git commit -m "LoveIt 테마 업데이트"
git push
```

## 최초 1회 설정

이미 설정이 끝난 상태입니다. 저장소를 새로 만들거나 Worker를 다시 배포해야 할 때만 참고하세요.

### GitHub Pages

저장소 Settings → Pages → Source를 **"GitHub Actions"**로 지정해야 배포 워크플로가 동작합니다. GitHub Free 플랜에서는 저장소가 **퍼블릭**이어야 합니다.

### 관리자 로그인 (GitHub OAuth App + Cloudflare Worker)

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
- Homepage URL: Worker 주소
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

[static/admin/config.yml](static/admin/config.yml)의 `backend.base_url`을 Worker 주소로 바꾸고 커밋·push합니다. [static/admin/stats.html](static/admin/stats.html)의 `STATS_ENDPOINT`도 같은 주소여야 합니다(다르면 `npm test`가 알려줌).

```yaml
backend:
  base_url: https://mane-jun-blog-oauth.<workers-서브도메인>.workers.dev
```

배포가 끝나면 관리자 페이지에서 GitHub 로그인이 동작합니다.

### 방문 통계 (Cloudflare API 토큰)

1. Cloudflare 대시보드 → 오른쪽 위 프로필 → **My Profile → API Tokens → Create Token → Custom token**. 권한은 **Account / Account Analytics / Read** 하나만 주고, Account Resources는 이 계정만 포함합니다. IP 필터와 TTL은 비워 둡니다.
2. 발급된 토큰을 Worker 비밀값으로 넣습니다. 명령을 실행하면 값을 물어보니 거기에 붙여넣습니다(채팅이나 파일에 남기지 마세요).
   ```powershell
   npx wrangler secret put CF_API_TOKEN --config oauth-worker/wrangler.jsonc
   ```
3. [wrangler.jsonc](oauth-worker/wrangler.jsonc)의 `CF_SITE_TAG`에 Web Analytics 사이트 식별자를 넣습니다. 비콘 `token`과는 다른 값으로, 대시보드 Web Analytics에서 사이트를 눌렀을 때 주소창의 `siteTag~in=` 뒤에 나옵니다. `CF_ACCOUNT_ID`는 `npx wrangler whoami`의 Account ID입니다.
4. `npm run deploy:oauth`로 Worker를 배포합니다.

### 댓글 (Giscus)

저장소 Settings → General → Features에서 **Discussions**를 켜고, [giscus 앱](https://github.com/apps/giscus)을 이 저장소에 설치합니다. 저장소·카테고리 ID는 https://giscus.app 설정 화면에서 확인해 [hugo.toml](hugo.toml)에 넣습니다.

### 검색 노출

1. `mane-jun.github.io`라는 이름의 공개 저장소를 만들고 블로그로 이동하는 `index.html`, 사이트맵 위치를 알려주는 `robots.txt`, `.nojekyll`을 둡니다. 저장소 이름이 이 형식이면 GitHub Pages가 자동으로 켜집니다.
2. Google Search Console에서 **URL 접두어** 속성으로 블로그 주소를 추가하고, HTML 태그 방식의 `content` 값을 [hugo.toml](hugo.toml)의 `[params.verification] google`에 넣어 배포한 뒤 확인을 누릅니다.
3. 네이버 서치어드바이저에 `https://mane-jun.github.io`를 등록하고, HTML 태그를 `mane-jun.github.io` 저장소의 `index.html`에 넣어 배포한 뒤 소유확인을 누릅니다.
4. 두 곳에 사이트맵을, 네이버에는 RSS도 제출합니다(주소는 [검색 노출](#검색-노출) 참고).

## 참고 사항

- `scripts/new-post.ps1`을 실행하는 콘솔(특히 구형 Windows PowerShell 콘솔)에서 한글이 깨진다면 Windows Terminal 사용을 권장합니다.
