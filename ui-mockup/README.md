# Design Tokens

OnlineExam-v2 프로젝트의 Design Tokens 파일

## 파일 목록

| 파일 | 설명 |
|-----|-----|
| `figma-variables.tokens.json` | Tokens Studio 형식 JSON (W3C DTCG 호환) |

## Figma Import 방법

### 권장 Plugin: Tokens Studio for Figma

[Tokens Studio for Figma](https://www.figma.com/community/plugin/843461159747178978/tokens-studio-for-figma) - Design Tokens 관리의 산업 표준 플러그인

### Import 절차

1. Figma에서 "Tokens Studio for Figma" 플러그인 설치
2. 플러그인 실행
3. "Tools" > "Load from file/folder" 선택
4. `figma-variables.tokens.json` 파일 업로드
5. "Apply to document" 클릭

### 대안 Plugin

- [Variables Import (shapefarm)](https://www.figma.com/community/plugin/1256972111705530093/export-import-variables) - 간단한 import용
- [Design Tokens Manager](https://www.figma.com/community/plugin/1263743870981744253/design-tokens-manager) - W3C DTCG 형식 지원

## 토큰 구조

### Color (22개)

Emerald 기반 색상 팔레트

| Token | Value | 용도 |
|-------|-------|-----|
| `color/background` | #f8fafc | 페이지 배경 |
| `color/foreground` | #1f2937 | 기본 텍스트 |
| `color/primary` | #10b981 | 주요 색상 (Emerald) |
| `color/primary-dark` | #059669 | Hover 상태 |
| `color/primary-light` | #34d399 | 밝은 변형 |
| `color/destructive` | #ef4444 | 에러/삭제 |
| `color/success` | #22c55e | 성공 |
| `color/warning` | #f59e0b | 경고 |

### Radius (4개) - dimension 타입

| Token | Value | 용도 |
|-------|-------|-----|
| `radius/sm` | 12px | 작은 컴포넌트 |
| `radius/md` | 16px | Button, Input |
| `radius/lg` | 24px | Card |
| `radius/xl` | 32px | Modal |

### Duration (6개) - duration 타입

| Token | Value | 용도 |
|-------|-------|-----|
| `duration/instant` | 100ms | Micro-interaction |
| `duration/fast` | 200ms | Tooltip, Hover |
| `duration/normal` | 300ms | 기본 전환 |
| `duration/slow` | 500ms | 페이지 요소 |
| `duration/slower` | 800ms | 복잡한 애니메이션 |
| `duration/chart` | 800ms | Chart 애니메이션 |

### Stagger (3개) - duration 타입

| Token | Value | 용도 |
|-------|-------|-----|
| `stagger/fast` | 50ms | 빠른 순차 애니메이션 |
| `stagger/normal` | 100ms | 기본 순차 애니메이션 |
| `stagger/slow` | 150ms | 느린 순차 애니메이션 |

## Figma Variables 미지원 타입

다음 타입은 Figma Variables에서 지원되지 않아 JSON에서 제외:
- `fontFamily` - 폰트 패밀리
- `lineHeight` - 줄 높이
- `fontWeight` - 폰트 굵기
- `cubicBezier` - 이징 커브

**참고**: Typography 설정은 Figma Text Styles로 별도 관리 권장

## 소스 파일

| 토큰 | 소스 |
|-----|-----|
| Color, Radius | `frontend/src/index.css` |
| Duration, Stagger | `frontend/src/lib/animations/transitions.ts` |
