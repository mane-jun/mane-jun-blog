# Decap CMS + GitHub OAuth 웹 편집기 설계

## 목적

현재 Hugo 블로그는 로컬 IDE에서 글 폴더와 `index.md`를 만들고 Git 커밋을 직접 해야 한다. 이 작업을 웹 관리자 화면에서 수행할 수 있도록 Decap CMS를 추가한다.

완성된 흐름은 다음과 같다.

1. 운영자가 `https://mane-jun.github.io/mane-jun-blog/admin/`에 접속한다.
2. GitHub OAuth로 로그인한다.
3. 웹 편집기에서 새 글을 작성하거나 기존 글을 수정하고 이미지를 업로드한다.
4. Decap CMS가 변경 내용을 `main` 브랜치에 커밋한다.
5. 기존 GitHub Actions 워크플로가 Hugo를 빌드하여 GitHub Pages에 배포한다.

## 범위

### 포함

- Decap CMS 관리자 페이지
- 게시글 생성, 조회, 수정, 삭제
- 제목, 작성일, 초안, 카테고리, 태그, 요약, 본문 필드
- 마크다운 편집과 미리보기
- 글 폴더 안으로 이미지 업로드
- GitHub OAuth 인증용 Cloudflare Worker
- 로컬 검증과 실제 OAuth·게시 흐름 검증 절차
- GitHub 및 Cloudflare 설정 안내

### 제외

- 별도 콘텐츠 데이터베이스
- 사용자 회원가입과 다중 역할 관리
- 글 검토용 브랜치 및 Pull Request 워크플로
- 예약 게시
- Decap CMS 자체 UI를 크게 변경하는 사용자 정의 위젯
- 특정 GitHub 저장소 하나로만 제한되는 GitHub App 기반 인증

## 시스템 구조

### Hugo 관리자 페이지

Hugo의 정적 파일 디렉터리 아래에 다음 파일을 둔다.

- `static/admin/index.html`: 버전을 고정한 Decap CMS 애플리케이션을 로드한다.
- `static/admin/config.yml`: GitHub 백엔드, OAuth 엔드포인트, 게시글 컬렉션과 편집 필드를 정의한다.

Hugo가 사이트를 빌드하면 두 파일은 프로젝트 사이트의 `/admin/` 경로에 배포된다.

### GitHub OAuth Worker

저장소의 `oauth-worker/` 디렉터리에 Cloudflare Worker 소스와 배포 설정을 둔다. Worker는 다음 두 역할만 수행한다.

- `/auth`: GitHub OAuth 승인 화면으로 리디렉션한다.
- `/callback`: GitHub가 전달한 임시 코드를 액세스 토큰으로 교환하고 Decap CMS 팝업에 결과를 전달한다.

`GITHUB_CLIENT_ID`와 `GITHUB_CLIENT_SECRET`은 Cloudflare 환경변수 또는 Secret으로 설정한다. Client Secret, 발급된 토큰, 로컬 비밀 파일은 Git에 저장하지 않는다.

### 기존 배포 흐름

Decap CMS는 `main` 브랜치에 직접 커밋한다. `.github/workflows/deploy.yml`의 기존 `push` 트리거가 실행되므로 배포 워크플로의 구조는 바꾸지 않는다.

## 콘텐츠 모델

게시글 컬렉션은 `content/posts`를 대상으로 하며 새 글 경로는 다음 규칙을 사용한다.

```text
content/posts/YYYY-MM-DD-제목-슬러그/index.md
```

한글 제목을 유지하기 위해 Decap CMS의 슬러그 인코딩을 Unicode로 설정하고 구분자는 `-`를 사용한다. 글별 미디어 폴더와 공개 경로를 빈 상대경로로 설정하여 첨부 이미지가 `index.md`와 같은 디렉터리에 저장되도록 한다.

필드는 다음과 같다.

| 필드 | 저장 형태 | 규칙 |
| --- | --- | --- |
| `title` | 문자열 | 필수 |
| `date` | ISO 8601 날짜·시각 | 생성 시 현재 시각 |
| `draft` | 불리언 | 새 글 기본값 `true` |
| `categories` | 문자열 배열 | 개발, 회고, 생각, 기타에서 선택 |
| `tags` | 문자열 배열 | 자유 입력, 선택 사항 |
| `summary` | 문자열 | 선택 사항 |
| `body` | 마크다운 본문 | 마크다운 편집기와 미리보기 사용 |

기존 게시글도 동일한 컬렉션에서 읽고 수정한다. 현재의 YAML front matter와 Hugo leaf bundle 구조는 유지한다.

## 작성 및 게시 흐름

새 글은 항상 `draft: true`로 생성한다. 초안 저장도 `main` 브랜치에 커밋되어 변경 이력이 남지만, 운영 빌드는 초안 글을 공개 결과에 포함하지 않는다.

게시할 때는 관리자가 `초안` 스위치를 끄고 저장한다. 그러면 `draft: false`가 커밋되고 기존 GitHub Actions가 사이트를 다시 빌드하고 배포한다. 공개 글을 수정하는 경우에도 같은 직접 저장 및 자동 배포 흐름을 사용한다.

게시글 목록은 작성일 내림차순으로 정렬하고 제목, 작성일, 카테고리, 초안 여부를 표시한다.

## 인증과 보안

Decap CMS는 표준 GitHub 백엔드를 사용한다. 공개 저장소 쓰기에 필요한 OAuth 범위만 요청하도록 `public_repo` 범위를 지정한다.

표준 GitHub OAuth의 `public_repo` 권한은 특정 저장소 하나가 아니라 로그인한 사용자가 쓸 수 있는 공개 저장소 전반에 적용된다. CMS 설정은 대상 저장소와 `main` 브랜치를 고정하지만, OAuth 토큰 자체는 GitHub App 설치 토큰처럼 저장소 하나에만 제한되지 않는다. 이 제약은 관리자 설정 문서에 명시한다.

관리자 페이지는 공개적으로 로드할 수 있지만 GitHub 인증과 대상 저장소 쓰기 권한이 없는 사용자는 콘텐츠를 변경할 수 없다. Worker는 허용된 관리자 Origin과 OAuth `state`를 검증하고, 운영 환경에서는 HTTPS URL만 사용한다.

## 오류 처리

- OAuth가 취소되거나 실패하면 저장소를 변경하지 않고 로그인 화면에서 재시도할 수 있게 한다.
- 제목과 작성일 등 필수 필드는 CMS에서 저장 전에 검증한다.
- 생성 대상 경로가 이미 존재하면 기존 파일을 덮어쓰지 않고 제목 또는 슬러그 변경을 요구한다.
- GitHub API 저장이 실패하면 커밋과 배포가 발생하지 않으며 오류를 표시한다.
- Hugo 빌드가 실패하면 새 배포가 실행되지 않으므로 마지막 정상 배포본은 유지된다. 원인은 GitHub Actions 로그에서 확인한다.
- 허용되지 않은 Origin 또는 유효하지 않은 OAuth `state` 요청은 Worker에서 거부한다.

## 저장소 변경 예정

- `static/admin/index.html` 추가
- `static/admin/config.yml` 추가
- `oauth-worker/`에 Worker 소스, 설정, 테스트 추가
- `.gitignore`에 Worker 로컬 비밀 파일 제외 규칙 추가
- `README.md`에 관리자 사용법과 GitHub OAuth·Cloudflare 배포 절차 추가

기존 게시글, Hugo 테마, 사이트 URL 구조와 GitHub Pages 배포 방식은 변경하지 않는다.

## 검증 계획

### 자동 검증

- Hugo 프로덕션 빌드 성공
- CMS 설정 파일 파싱 성공
- Worker의 허용 Origin, `state`, GitHub 오류 응답 처리 테스트
- 저장소에 Client Secret이나 토큰이 포함되지 않았는지 검색

### 수동 통합 검증

GitHub OAuth App과 Cloudflare Worker가 설정된 후 다음 시나리오를 순서대로 확인한다.

1. 관리자 URL에서 GitHub 로그인
2. 초안 글 생성 및 저장
3. 글 디렉터리와 `index.md` 생성 확인
4. 본문 이미지 업로드 및 상대경로 확인
5. 초안 글이 공개 사이트에 표시되지 않는지 확인
6. 초안 해제 후 자동 배포와 공개 여부 확인
7. 기존 글 수정 후 재배포 확인
8. 인증되지 않은 계정의 쓰기 차단 확인

외부 OAuth 자격 증명은 저장소에 포함할 수 없으므로, 자동 검증까지는 코드만으로 수행하고 실제 로그인 이후 검증은 운영자가 GitHub와 Cloudflare 설정을 완료한 뒤 진행한다.

## 완료 기준

- `/mane-jun-blog/admin/`에서 Decap CMS가 정상 로드된다.
- GitHub OAuth를 통과한 운영자가 기존 글을 열고 수정할 수 있다.
- 새 글이 정해진 leaf bundle 구조로 생성된다.
- 이미지를 글 폴더에 업로드하고 본문에서 상대경로로 참조할 수 있다.
- 초안과 공개 상태가 Hugo 출력에 올바르게 반영된다.
- 저장 시 기존 GitHub Actions 배포가 자동으로 실행된다.
- 비밀값이 저장소와 정적 관리자 번들에 포함되지 않는다.
