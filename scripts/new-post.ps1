<#
새 블로그 글을 대화형으로 생성하는 스크립트.
사용법: 프로젝트 어디서든 -> powershell -File scripts\new-post.ps1
#>

$ErrorActionPreference = "Stop"
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$repoRoot = Split-Path -Parent $PSScriptRoot
$postsDir = Join-Path $repoRoot "content\posts"

$title = Read-Host "글 제목"
if ([string]::IsNullOrWhiteSpace($title)) {
    Write-Host "제목은 비워둘 수 없습니다." -ForegroundColor Red
    exit 1
}

$categories = @("개발", "회고", "생각")
Write-Host ""
for ($i = 0; $i -lt $categories.Length; $i++) {
    Write-Host "  [$($i + 1)] $($categories[$i])"
}
$choice = Read-Host "카테고리 선택 (번호)"
$categoryIndex = [int]$choice - 1
if ($categoryIndex -lt 0 -or $categoryIndex -ge $categories.Length) {
    Write-Host "잘못된 선택입니다." -ForegroundColor Red
    exit 1
}
$category = $categories[$categoryIndex]

$tagsInput = Read-Host "태그 (쉼표로 구분, 생략 가능)"
$tags = @()
if (-not [string]::IsNullOrWhiteSpace($tagsInput)) {
    $tags = $tagsInput -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
}
$tagsToml = ($tags | ForEach-Object { "`"$_`"" }) -join ", "

$slug = $title.ToLower() -replace '[^\p{L}\p{Nd}]+', '-'
$slug = $slug.Trim('-')
if ([string]::IsNullOrWhiteSpace($slug)) {
    $slug = "post"
}

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$fileName = "$dateStamp-$slug.md"
$filePath = Join-Path $postsDir $fileName

$suffix = 1
while (Test-Path $filePath) {
    $fileName = "$dateStamp-$slug-$suffix.md"
    $filePath = Join-Path $postsDir $fileName
    $suffix++
}

$dateIso = Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"

$frontMatter = @"
---
title: "$title"
date: $dateIso
draft: false
categories: ["$category"]
tags: [$tagsToml]
summary: ""
---

여기에 본문을 작성하세요.
"@

New-Item -ItemType Directory -Force -Path $postsDir | Out-Null
Set-Content -Path $filePath -Value $frontMatter -Encoding utf8

Write-Host ""
Write-Host "생성됨: $filePath" -ForegroundColor Green

$codeCmd = Get-Command code -ErrorAction SilentlyContinue
if ($codeCmd) {
    & code $filePath
} else {
    Start-Process notepad $filePath
}

