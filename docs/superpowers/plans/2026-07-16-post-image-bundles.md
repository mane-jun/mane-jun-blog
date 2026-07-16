# 글-이미지 번들링 (Hugo Page Bundle 전환) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `content/posts/`의 각 글을 Hugo Leaf Bundle(`<slug>/index.md`)로 전환해서 글과 이미지가 같은 폴더에 묶이도록 한다.

**Architecture:** 기존 `content/posts/<slug>.md` 파일들을 `content/posts/<slug>/index.md`로 이동한다(폴더명 = 기존 파일명이므로 URL 불변). 흩어져 있던 `image.png`는 이를 참조하는 글의 폴더로 옮긴다. 새 글 생성 스크립트(`scripts/new-post.ps1`)와 `README.md`를 이 구조에 맞게 갱신한다.

**Tech Stack:** Hugo (LoveIt 테마), PowerShell, Git.

## Global Constraints

- 마이그레이션 후 각 글의 URL(`/posts/<slug>/`)은 기존과 동일해야 한다 — 폴더명은 기존 파일명(확장자 제외)과 정확히 일치시킨다.
- `hugo.toml` 설정 변경은 하지 않는다 (Page Bundle은 Hugo 기본 기능).
- `about.md`는 번들 전환 대상이 아니다 (섹션 페이지가 아닌 단일 콘텐츠 페이지이며 이미지 첨부 사례 없음).
- 커밋은 작업 단위(태스크)별로 분리한다.

---

### Task 1: 기존 글 5개를 Page Bundle로 마이그레이션

**Files:**
- Move: `content/posts/2026-06-monthly-retrospective.md` → `content/posts/2026-06-monthly-retrospective/index.md`
- Move: `content/posts/2026-07-16-기타-테스트.md` → `content/posts/2026-07-16-기타-테스트/index.md`
- Move: `content/posts/image.png` → `content/posts/2026-07-16-기타-테스트/image.png`
- Move: `content/posts/2026-07-16-두려움-한치-없이-따라오길.md` → `content/posts/2026-07-16-두려움-한치-없이-따라오길/index.md`
- Move: `content/posts/hello-game-dev.md` → `content/posts/hello-game-dev/index.md`
- Move: `content/posts/thoughts-on-writing.md` → `content/posts/thoughts-on-writing/index.md`

**Interfaces:**
- Produces: 5개의 `content/posts/<slug>/index.md` 번들 폴더 (이후 Task 2, 3에서 문서화 대상으로 참조).

- [ ] **Step 1: 마이그레이션 전 상태 확인**

```bash
cd /d/Projects/mane-jun-blog
git status
ls content/posts/
```

Expected: `content/posts/`에 5개의 `.md` 파일과 `image.png`가 평평하게 존재. `image.png`는 아직 git에 추가되지 않은 untracked 파일임을 확인.

- [ ] **Step 2: 각 글을 폴더로 이동 (git mv)**

```bash
cd /d/Projects/mane-jun-blog

mkdir -p "content/posts/2026-06-monthly-retrospective"
git mv "content/posts/2026-06-monthly-retrospective.md" "content/posts/2026-06-monthly-retrospective/index.md"

mkdir -p "content/posts/2026-07-16-기타-테스트"
git mv "content/posts/2026-07-16-기타-테스트.md" "content/posts/2026-07-16-기타-테스트/index.md"
mv "content/posts/image.png" "content/posts/2026-07-16-기타-테스트/image.png"

mkdir -p "content/posts/2026-07-16-두려움-한치-없이-따라오길"
git mv "content/posts/2026-07-16-두려움-한치-없이-따라오길.md" "content/posts/2026-07-16-두려움-한치-없이-따라오길/index.md"

mkdir -p "content/posts/hello-game-dev"
git mv "content/posts/hello-game-dev.md" "content/posts/hello-game-dev/index.md"

mkdir -p "content/posts/thoughts-on-writing"
git mv "content/posts/thoughts-on-writing.md" "content/posts/thoughts-on-writing/index.md"
```

Note: `image.png`는 untracked 상태였으므로 `git mv`가 아닌 `mv`로 이동한다 (Task 1 Step 4에서 새 경로로 `git add` 한다).

- [ ] **Step 3: 이동 결과 확인**

```bash
find content/posts -type f | sort
```

Expected:
```
content/posts/2026-06-monthly-retrospective/index.md
content/posts/2026-07-16-기타-테스트/image.png
content/posts/2026-07-16-기타-테스트/index.md
content/posts/2026-07-16-두려움-한치-없이-따라오길/index.md
content/posts/hello-game-dev/index.md
content/posts/thoughts-on-writing/index.md
```

- [ ] **Step 4: 이미지 참조 확인**

```bash
grep -n "image.png" "content/posts/2026-07-16-기타-테스트/index.md"
```

Expected: `![alt text](image.png)` — 상대경로이므로 파일을 옮겨도 수정 불필요. 값이 다르면(예: 절대경로였다면) 해당 줄을 상대경로 `image.png`로 고친다.

- [ ] **Step 5: Hugo 빌드로 검증**

```bash
cd /d/Projects/mane-jun-blog
hugo --gc --minify -D -d /tmp/hugo-verify-build 2>&1 | tail -30
```

Expected: 에러 없이 빌드 성공. 출력 로그의 `Pages` 수가 마이그레이션 전과 동일해야 한다 (글 5개 + 목록/태그/카테고리 페이지 등).

```bash
ls /tmp/hugo-verify-build/posts/2026-07-16-기타-테스트/
```

Expected: `index.html`과 `image.png`가 함께 존재 (이미지가 번들 리소스로 같이 퍼블리시됨을 확인).

```bash
rm -rf /tmp/hugo-verify-build
```

- [ ] **Step 6: 커밋**

```bash
cd /d/Projects/mane-jun-blog
git add content/posts
git status
git commit -m "$(cat <<'EOF'
Migrate posts to Hugo page bundles

Each post now lives in its own content/posts/<slug>/index.md
folder so images added to a post stay bundled with it. URLs are
unchanged since folder names match the previous filenames.
EOF
)"
```

Expected: `git status`에 새로 추가된 `content/posts/2026-07-16-기타-테스트/image.png`를 포함해 모든 이동/추가가 staged 상태로 보인 뒤 커밋 성공.

---

### Task 2: `scripts/new-post.ps1`을 번들 구조로 변경

**Files:**
- Modify: `scripts/new-post.ps1`

**Interfaces:**
- Consumes: Task 1에서 확정된 규칙 — 새 글은 `content/posts/<slug>/index.md`로 생성.
- Produces: 실행 시 `content/posts/<slug>/` 폴더 + 그 안의 `index.md`.

- [ ] **Step 1: 현재 파일 경로 로직을 폴더 경로로 변경**

`scripts/new-post.ps1`의 44~53번 줄(파일명/경로 계산 및 중복 체크)을 다음으로 교체:

```powershell
$dateStamp = Get-Date -Format "yyyy-MM-dd"
$slugDirName = "$dateStamp-$slug"
$postDir = Join-Path $postsDir $slugDirName

$suffix = 1
while (Test-Path $postDir) {
    $slugDirName = "$dateStamp-$slug-$suffix"
    $postDir = Join-Path $postsDir $slugDirName
    $suffix++
}

$filePath = Join-Path $postDir "index.md"
```

- [ ] **Step 2: 디렉터리 생성 로직 변경**

70번 줄 `New-Item -ItemType Directory -Force -Path $postsDir | Out-Null`를 다음으로 교체 (글 전용 폴더를 생성하도록):

```powershell
New-Item -ItemType Directory -Force -Path $postDir | Out-Null
```

- [ ] **Step 3: 전체 파일 diff 확인**

```bash
cd /d/Projects/mane-jun-blog
git diff scripts/new-post.ps1
```

Expected diff (라인 번호는 위 Step 1/2 기준):

```diff
-$slug = $title.ToLower() -replace '[^\p{L}\p{Nd}]+', '-'
-$slug = $slug.Trim('-')
-if ([string]::IsNullOrWhiteSpace($slug)) {
-    $slug = "post"
-}
-
-$dateStamp = Get-Date -Format "yyyy-MM-dd"
-$fileName = "$dateStamp-$slug.md"
-$filePath = Join-Path $postsDir $fileName
-
-$suffix = 1
-while (Test-Path $filePath) {
-    $fileName = "$dateStamp-$slug-$suffix.md"
-    $filePath = Join-Path $postsDir $fileName
-    $suffix++
-}
+$slug = $title.ToLower() -replace '[^\p{L}\p{Nd}]+', '-'
+$slug = $slug.Trim('-')
+if ([string]::IsNullOrWhiteSpace($slug)) {
+    $slug = "post"
+}
+
+$dateStamp = Get-Date -Format "yyyy-MM-dd"
+$slugDirName = "$dateStamp-$slug"
+$postDir = Join-Path $postsDir $slugDirName
+
+$suffix = 1
+while (Test-Path $postDir) {
+    $slugDirName = "$dateStamp-$slug-$suffix"
+    $postDir = Join-Path $postsDir $slugDirName
+    $suffix++
+}
+
+$filePath = Join-Path $postDir "index.md"
```

```diff
-New-Item -ItemType Directory -Force -Path $postsDir | Out-Null
+New-Item -ItemType Directory -Force -Path $postDir | Out-Null
```

- [ ] **Step 4: 스크립트 실행 테스트**

```powershell
cd D:\Projects\mane-jun-blog
powershell -File scripts\new-post.ps1
```

프롬프트에 순서대로 입력: 제목 `번들 테스트`, 카테고리 `3` (생각), 태그는 빈 값(Enter).

Expected: `content\posts\<오늘날짜>-번들-테스트\index.md`가 생성되고 에디터가 열림 (또는 `code` 명령이 없으면 메모장).

```powershell
Get-ChildItem "content\posts\*번들-테스트*" -Recurse
```

Expected: 폴더 안에 `index.md` 하나만 존재.

- [ ] **Step 5: 테스트로 생성한 글 삭제**

```powershell
cd D:\Projects\mane-jun-blog
Remove-Item -Recurse -Force "content\posts\*번들-테스트*"
git status
```

Expected: `git status`에 테스트 글 흔적이 남지 않음 (애초에 untracked 상태로 생성되었으므로 삭제만으로 정리 완료).

- [ ] **Step 6: 커밋**

```bash
cd /d/Projects/mane-jun-blog
git add scripts/new-post.ps1
git commit -m "$(cat <<'EOF'
Generate new posts as page bundles

new-post.ps1 now creates content/posts/<slug>/index.md instead of
a flat .md file, matching the page-bundle structure so images
added to a new post land in the same folder.
EOF
)"
```

---

### Task 3: `README.md` 문서 갱신

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1의 최종 폴더 구조, Task 2의 스크립트 동작.

- [ ] **Step 1: "방법 2: 직접 파일 생성" 섹션 수정**

`README.md`의 28~43번 줄을 다음으로 교체:

```markdown
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
```

- [ ] **Step 2: "프로젝트 구조" 트리 갱신**

`README.md`의 프로젝트 구조 코드 블록(79~90번 줄 부근) 중 다음 부분을 교체:

```
├── content/
│   ├── about.md                   # 소개 페이지
│   └── posts/                     # 모든 글
```

를 다음으로 교체:

```
├── content/
│   ├── about.md                   # 소개 페이지
│   └── posts/                     # 모든 글 (글마다 <슬러그>/index.md + 이미지 폴더)
```

- [ ] **Step 3: 변경 diff 확인**

```bash
cd /d/Projects/mane-jun-blog
git diff README.md
```

Expected: 위 Step 1, 2의 내용대로 두 군데만 바뀌어 있어야 함. 다른 섹션은 변경되지 않음.

- [ ] **Step 4: 커밋**

```bash
cd /d/Projects/mane-jun-blog
git add README.md
git commit -m "$(cat <<'EOF'
Document page-bundle post structure in README

Update the manual post-creation instructions and project tree to
reflect content/posts/<slug>/index.md instead of flat .md files.
EOF
)"
```

---

### Task 4: 최종 통합 검증

**Files:**
- (읽기 전용 검증, 파일 변경 없음)

**Interfaces:**
- Consumes: Task 1~3의 모든 산출물.

- [ ] **Step 1: 로컬 서버로 전체 사이트 확인**

```bash
cd /d/Projects/mane-jun-blog
hugo server -D --port 1313 &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:1313/posts/2026-07-16-기타-테스트/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:1313/posts/2026-07-16-기타-테스트/image.png
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:1313/posts/hello-game-dev/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:1313/posts/thoughts-on-writing/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:1313/posts/2026-06-monthly-retrospective/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:1313/posts/2026-07-16-두려움-한치-없이-따라오길/
```

Expected: 모두 `200`.

- [ ] **Step 2: 서버 종료**

```bash
kill %1
```

- [ ] **Step 3: git 이력 정리 확인**

```bash
cd /d/Projects/mane-jun-blog
git log --oneline -4
git status
```

Expected: Task 1, 2, 3의 커밋 3개가 순서대로 보이고, working tree는 clean.

---
