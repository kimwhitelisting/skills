# 팀 공유용 스킬 번역 문서

이 폴더는 번역된 스킬 문서를 팀이 바로 열람/리뷰할 수 있도록 한곳에 취합한 패키지입니다.

## 구성

- `INDEX.md`: 전체 스킬 인덱스 및 스킬별 문서 링크
- `skills/`: 번역된 스킬 원문(.md/.txt) 전체

## 팀 공유 방법

1. 이 폴더(`docs/skills/team_share_ko`)를 그대로 공유합니다.
2. 팀원은 `INDEX.md`부터 열어 필요한 스킬 문서로 이동합니다.
3. 각 스킬의 핵심 문서는 `SKILL.md`입니다.

## 갱신 방법

번역본이 추가/수정되면 아래 명령으로 공유 패키지를 재생성합니다.

```powershell
python C:\dev\one_a_day\scripts\build_skill_share_pack.py
```

## 참고

- 이 폴더는 배포 편의를 위한 취합본입니다.
- 원본 번역본은 `docs/skills/translated`에 있습니다.
