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

제목 → 카테고리 번호 선택 → 태그(선택) 순으로 입력하면 `content/posts/`에 front matter가 채워진 파일이 생성되고 에디터가 자동으로 열립니다.

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
├── scripts/
│   └── new-post.ps1               # 새 글 작성 도우미 스크립트
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
