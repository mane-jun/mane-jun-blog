#!/usr/bin/env bash
# Opens or closes the GitHub reminder issue for one kind of retrospective. Run by .github/workflows/retro-reminder.yml.
#   scripts/retro-reminder.sh <daily|weekly|monthly> <remind|close>
# remind: if the retrospective is missing or a draft, open an issue assigned to $ASSIGNEE (and close older ones of the same kind).
# close:  only close the reminder once the retrospective is published.
# Needs GH_TOKEN, GH_REPO, LABEL, ASSIGNEE, ADMIN_URL; RETRO_DATE is passed through to retro-reminder.mjs.
set -euo pipefail

kind="$1"
mode="$2"
declare -A WORDS=([daily]=일간회고 [weekly]=주간회고 [monthly]=월간회고)
word="${WORDS[$kind]}"

result="$(node scripts/retro-reminder.mjs "$kind")"
status="$(jq -r .status <<<"$result")"
title="$(jq -r .title <<<"$result")"
entry="$(jq -r '.entry // ""' <<<"$result")"
echo "$kind: $title → $status"

open_reminders() {
  gh issue list --label "$LABEL" --state open --limit 100 --json number,title --jq '.[] | "\(.number)\t\(.title)"'
}

if [ "$status" = "published" ]; then
  while IFS=$'\t' read -r number issue_title; do
    [ -n "$number" ] || continue
    if [[ "$issue_title" == *"$title"* ]]; then
      gh issue close "$number" --comment "$title 공개 완료! 👍"
    fi
  done < <(open_reminders)
  exit 0
fi
[ "$mode" = "remind" ] || exit 0

# Close reminders for earlier periods of the same kind; keep going only if this period has none yet.
existing=""
while IFS=$'\t' read -r number issue_title; do
  [ -n "$number" ] || continue
  [[ "$issue_title" == *"$word"* ]] || continue
  if [[ "$issue_title" == *"$title"* ]]; then
    existing="$number"
  else
    gh issue close "$number" --reason "not planned" --comment "지난 기간의 알림이라 닫습니다."
  fi
done < <(open_reminders)
if [ -n "$existing" ]; then
  echo "Reminder #$existing is already open for $title"
  exit 0
fi

if [ "$status" = "draft" ]; then
  issue_title="📝 ${title}가 아직 초안이에요"
  body="${title}가 초안으로만 저장되어 사이트에 보이지 않습니다. 편집 화면에서 **초안** 스위치를 끄고 저장하세요.

- [이 회고 편집하기](${ADMIN_URL}#/collections/posts/entries/${entry})"
else
  issue_title="📝 ${title}를 아직 안 썼어요"
  case "$kind" in
    daily) hint="바쁘면 **오늘 체크(컨디션·운동)와 오늘 한 줄만** 써도 됩니다." ;;
    weekly) hint="이번 주를 돌아보는 데 15분이면 충분해요. 일간회고의 컨디션·운동 기록을 참고하세요." ;;
    monthly) hint="이번 주말에 20~30분 내서 지난달을 돌아보세요. 회고 모아보기의 잔디와 주간회고를 참고하면 쉬워요." ;;
  esac
  body="${hint}

- [${word} 쓰기](${ADMIN_URL}#/collections/${kind}/new)"
fi
body="${body}

회고를 공개하면 이 알림은 자동으로 닫힙니다."

gh issue create --title "$issue_title" --body "$body" --label "$LABEL" --assignee "$ASSIGNEE"
