# 글-이미지 번들링 (Hugo Page Bundle 전환)

## 배경

`content/posts/`에 글(.md)과 이미지가 같은 평평한 폴더에 뒤섞여 쌓이고 있다. 예: 글 작성 중 추가한 `image.png`가 어느 글에 속하는지 파일명만으로는 알 수 없고, 글을 옮기거나 삭제할 때 이미지가 같이 따라가지 않는다.

## 목표

각 글을 자신의 이미지와 하나의 폴더로 묶는다. Hugo의 Leaf Bundle 방식을 사용한다.

## 구조

- 기존: `content/posts/<slug>.md`
- 변경 후: `content/posts/<slug>/index.md`
- 이미지는 같은 `<slug>/` 폴더 안에 두고, 마크다운에서 `![설명](파일명.png)` 형태의 상대경로로 참조한다.
- 폴더명 `<slug>`는 기존 파일명(확장자 제외)과 동일하게 유지하므로 `/posts/<slug>/` URL은 변경되지 않는다.
- Hugo 설정(`hugo.toml`) 변경은 불필요 — Page Bundle은 Hugo 기본 기능이다.

## 마이그레이션 대상

기존 5개 글 전부를 이 구조로 옮긴다:

| 기존 파일 | 새 경로 |
|---|---|
| `content/posts/2026-06-monthly-retrospective.md` | `content/posts/2026-06-monthly-retrospective/index.md` |
| `content/posts/2026-07-16-기타-테스트.md` | `content/posts/2026-07-16-기타-테스트/index.md` |
| `content/posts/2026-07-16-두려움-한치-없이-따라오길.md` | `content/posts/2026-07-16-두려움-한치-없이-따라오길/index.md` |
| `content/posts/hello-game-dev.md` | `content/posts/hello-game-dev/index.md` |
| `content/posts/thoughts-on-writing.md` | `content/posts/thoughts-on-writing/index.md` |

`content/posts/image.png`(현재 흩어져 있는, `기타-테스트` 글이 `![alt text](image.png)`로 참조 중인 파일)는 `2026-07-16-기타-테스트/` 폴더 안으로 이동한다. 마크다운의 상대경로 참조는 수정할 필요 없음.

## 스크립트 변경 (`scripts/new-post.ps1`)

- 파일 생성 대상을 `content/posts/<slug>.md`에서 `content/posts/<slug>/index.md`로 변경.
- 중복 슬러그 체크를 파일 존재 대신 폴더 존재 여부로 변경.
- 나머지 로직(제목/카테고리/태그 입력, front matter 생성, 에디터 자동 실행)은 그대로 유지.

## 문서 변경 (`README.md`)

- "방법 2: 직접 파일 생성" 섹션을 폴더+`index.md` 구조로 갱신.
- 이미지는 글과 같은 폴더에 넣고 상대경로로 참조한다는 안내 한 줄 추가.
- "프로젝트 구조" 트리 예시를 번들 구조로 갱신.

## 범위 밖

- 이미지 최적화(리사이즈/압축), alt 텍스트 규칙 등은 다루지 않는다.
- `about.md`는 이미지 첨부 사례가 없으므로 번들 전환 대상에서 제외한다.

## 검증

- `hugo server -D`로 로컬 빌드 후 5개 글의 URL이 기존과 동일한지 확인.
- `기타-테스트` 글에서 이미지가 정상 렌더링되는지 확인.
- `scripts/new-post.ps1`을 한 번 실행해 새 글 폴더가 올바르게 생성되는지 확인 후 테스트로 만든 글은 삭제.
