---
name: supabase-migration-pattern
description: 기존 Supabase 데이터를 보존하면서 스키마를 변경하는 4단계 마이그레이션 패턴
type: project
created: 2026-05-27
---

migrate_v1_to_v2.sql 패턴:
1. ALTER TABLE ADD COLUMN IF NOT EXISTS (멱등 보장)
2. INSERT 신규 행 ON CONFLICT DO NOTHING (재실행 안전)
3. UPDATE 기존 거래 FK → 새 ID로 재매핑
4. UPDATE 구형 행 SET archived=true (삭제 금지)

CLI 명령: `supabase link --project-ref <ref>` 후 `supabase db query --linked --file <file.sql>`

**Why:** 마이그레이션 SQL이 idempotent해야 Supabase 대시보드에서 중복 실행해도 안전하다.
**How to apply:** 다음 스키마 변경 시도 동일 4단계 패턴 사용. supabase/.temp/ 디렉토리는 .gitignore에 추가하거나 커밋 전 git restore --staged로 제외한다.
