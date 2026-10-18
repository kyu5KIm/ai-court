# AI 법정 · court-skill 한국어판

> [alexyc9381/court-skill](https://github.com/alexyc9381/court-skill)을 고친 버전이에요.
> 원작자는 **Alex Chen** ([@nocodealex](https://instagram.com/nocodealex))이고, MIT 라이선스를 따라요.
> 원작의 재판 방식(검사, 변호인, 서로 표를 못 보는 배심원, 판사)은 그대로 두고, 한국어 환경과 웹 법정 화면을 더했어요.

클로드에게 "이 아이디어 어때?" 하고 물으면 대개 "좋은데요!"라고 맞장구를 쳐요. `/court`는 같은 아이디어를
재판에 올려요. 검사 클로드는 왜 망할지, 변호인 클로드는 왜 될지를 따지고, 직업과 입장이 다른 배심원 클로드들이
서로의 표를 보지 못한 채 유죄나 무죄를 고르고, 판사 클로드가 무엇을 바꿔야 표가 뒤집히는지 정리해 줘요.

## 원작과 달라진 점

| 무엇 | 설명 |
| --- | --- |
| 한국어 Windows 오류 수정 | 원작은 파일을 운영체제 기본 인코딩으로 읽어서, 한국어 Windows(cp949)에서 한글 사건을 열면 바로 `UnicodeDecodeError`가 나요. 모든 파일을 UTF-8로 읽고 쓰게 고쳤어요. |
| 법정 화면 | 재판을 픽셀 캐릭터들이 움직이는 법정으로 보여 줘요. 검사와 변호인이 발언대로 걸어 나와 말풍선으로 진술하고, 배심원이 한 명씩 팻말을 들고, 판사봉과 함께 평결 도장이 찍혀요. 아래에는 전체 진술이 대화처럼 남아요. |
| 실시간 반영 | `court.py serve`로 법정을 열면, 진술과 표가 파일로 생기는 대로 화면이 이어서 재생돼요. |
| 웹에서 새 사건 접수 | 페이지의 **＋ 새 사건** 버튼으로 사건을 접수하면, 서버가 `claude -p`로 검사, 변호인, 배심원, 판사를 차례로 불러 재판을 끝까지 진행해요. Claude Code 대화창으로 돌아갈 필요가 없어요. |
| 법정에 질문 | 재판 중이나 끝난 뒤에 판사, 검사, 변호인, 서기, 배심원 누구에게나 질문할 수 있어요. 답하는 쪽은 그 재판의 기록만 보고 답해요. |
| 답변 언어 | 하위 에이전트가 사건 기록과 같은 언어로 답하도록 지시를 더했어요. 한국어로 사건을 쓰면 진술과 판결도 한국어로 나와요. |
| 쓰는 중인 글 보기 | 웹에서 연 재판은 진술과 판결문이 다 써지기 전부터 «작성 중» 초안으로 보여요. 질문 답변도 쓰이는 대로 보여요. |
| 빠르고 가볍게 | 웹에서 연 재판과 질문은 짧은 전용 시스템 프롬프트를 써서 호출마다 약 9,100토큰을 덜 보내요. 배심원만 빠른 모델(haiku)로 돌릴 수 있고, 한 번에 돌릴 호출 수도 정할 수 있어요. 호출마다 걸린 시간과 토큰은 `runner.json`에 남아요. |
| 법정 화면 부가 기능 | 지난 재판 목록과 두 재판 비교, 재심 버튼, 장면 타임라인, 캐릭터 클릭, 추천 질문, 비용·시간 패널, 관점별 표 분포, 평결 이미지 저장, 인쇄, 다크/라이트, 효과음, 영어 전환. 아래 «법정 화면에서 할 수 있는 것»에 정리했어요. |

## 설치

Claude Code에 이렇게 붙여 넣으세요.

```
https://github.com/kyu5KIm/ai-court
이 스킬을 설치하고, /court 가 되는지 확인해 줘.
```

직접 복사해도 돼요.

```bash
git clone https://github.com/kyu5KIm/ai-court
cp -r ai-court/skills/court ~/.claude/skills/
```

Windows 탐색기라면 `ai-court\skills\court` 폴더를 `사용자 폴더\.claude\skills\` 안으로 복사하면 같아요.
스킬이 도우미 파일을 `python3`로 실행하므로 Python 3가 필요해요.

## 쓰는 법

### 1. 대화창에서 재판 열기

```
/court --quick 회사를 그만두고 온라인으로 수제 캔들을 파는 일을 전업으로 하려고 해. 저축은 800만 원, 3개월 동안 40개를 팔았고 한 개에 3만 원이야. 매달 생활비는 200만 원이야.
```

| 옵션 | 뜻 |
| --- | --- |
| (없음) | 배심원 12명, 하위 에이전트 17번 |
| `--quick` | 배심원 6명, 하위 에이전트 11번 |
| `--jury N` | 배심원 3명에서 12명 사이 |
| `--seed S` | 배심원 수를 줄였을 때 누가 앉을지 고정 |

배심원은 적힌 내용만 알아요. 쓸 수 있는 돈과 시간, 지금까지 해 본 것과 결과, 누구를 상대로 하는지, 가격과 기간을
숫자로 적을수록 평결이 구체적이에요. 재판 중에는 파일이 여러 개 생기니 Shift+Tab으로 편집 자동 승인 모드를 켜 두면
편해요.

재판을 열면 Claude가 법정 서버를 함께 띄우고 `http://127.0.0.1:8765/` 주소를 알려 줘요. 재판이 끝나면 평결문
`VERDICT.md`와 재생용 화면 `trial.html`이 `.court/<날짜-시간>/` 폴더에 저장돼요.

### 2. 웹 법정에서 바로 열기

```bash
python3 ~/.claude/skills/court/court.py serve
```

브라우저에서 `http://127.0.0.1:8765/`를 열고 **＋ 새 사건**을 누르면 돼요. 재판 기록은 이 명령을 실행한 폴더의
`.court/` 안에 쌓여요. 이 방식과 질문 기능은 컴퓨터에 설치된 `claude` 명령을 쓰므로, 처음 한 번은 로그인해야 해요.

```bash
claude auth login
```

### 명령 모음

| 명령 | 하는 일 |
| --- | --- |
| `court.py serve [--port P] [--model M] [--jury-model J] [--parallel N]` | 실시간 법정 서버. 새 사건 접수와 질문을 받아요. |
| `court.py run [--model M] [--jury-model J] [--parallel N]` | `init`으로 연 가장 최근 재판을 `claude -p`로 끝까지 진행해요. |
| `court.py render` | 평결을 세어 `VERDICT.md`와 `trial.html`을 써요. |
| `court.py plan / init / next / prompts / check / tally` | 원작과 같은, 재판 진행용 장부 명령이에요. |

| 옵션 | 뜻 |
| --- | --- |
| `--model M` | 모든 역할이 쓸 모델이에요. 비워 두면 `claude` 기본 모델을 써요. |
| `--jury-model J` | 배심원만 쓸 모델이에요(예: `haiku`). 새 사건 접수 창의 «배심원 모델»로도 고를 수 있어요. |
| `--parallel N` | 한 단계에서 동시에 돌릴 호출 수(1~12, 기본 6)예요. 배심원 12명을 한 번에 돌리려면 12로 올리면 돼요. 다만 요금제의 속도 제한에 걸리기 쉽고, 두 번 실패한 배심원은 «기권»이 돼요. |

`claude`가 PATH에 없다면 `COURT_CLAUDE` 환경 변수에 실행 파일 경로를 적어 주세요.

웹에서 연 재판이 끝나면 `.court/<날짜-시간>/runner.json`의 `calls`에 호출마다 걸린 시간, 첫 글자까지 걸린 시간, 토큰 수,
쓴 모델이 남아요. 어느 단계가 느린지 볼 때 쓰면 돼요.

### 법정 화면에서 할 수 있는 것

| 기능 | 어디서 | 하는 일 |
| --- | --- | --- |
| 장면 타임라인 | 무대 아래 막대, 머리글 단계 칩 | 원하는 장면으로 바로 이동해요. 앞 장면은 한 번에 펼쳐지고 고른 장면부터 재생돼요. |
| 캐릭터 클릭 | 무대의 캐릭터 | 그 사람의 가장 최근 발언으로 이동하고, 질문 대상으로 정해요. 키보드(Tab → Enter)도 돼요. |
| 추천 질문 | 질문창 위 칩 | 누르면 질문 대상과 내용이 채워져 바로 보내져요. 평결 질문은 판결 뒤에만 보여요. |
| 지난 재판 | 머리글 «지난 재판» | `.court/`의 재판을 최신순으로 보여 주고 골라 열어요(`?run=이름`). 예전 재판에도 질문할 수 있어요. |
| 재판 비교 | «지난 재판»에서 두 개 체크 | 두 평결을 나란히 놓고, 표를 바꾼 배심원을 표시해요. |
| 재심 | 머리글 «재심», 마지막 서기 장면 | 원래 사건에 무죄 조건과 «해낸 것과 그 결과» 빈칸을 붙이고, 같은 배심원 수와 시드로 접수 창을 채워요. |
| 비용과 시간 | 푸터 위 접이식 패널 | 웹에서 연 재판의 전체 시간, 호출 수, 토큰, 호출별 표. 진행 중에는 «판결까지 약 N초»도 보여요. |
| 관점별 표 분포 | 평결 카드 | 배심원을 돈 / 손님과 시장 / 실행 / 위험과 규칙으로 묶어 누가 어느 쪽에 섰는지 보여 줘요. |
| 평결 이미지 | 머리글 «평결 이미지» | 사건, 평결 도장, 표 분포, 무죄 조건을 담은 PNG를 내려받아요(외부 라이브러리 없음). |
| 인쇄 | 머리글 «인쇄» | 무대를 빼고 기록과 판결문만 문서처럼 인쇄해요. |
| 화면 밝기 | 머리글 ◐ | 시스템 설정 / 밝게 / 어둡게. 고른 값은 이 브라우저에 기억해요. |
| 효과음 | 조작 줄 🔇 | 판사봉, 도장, 팻말 소리. 기본은 꺼져 있어요(Web Audio로 합성, 소리 파일 없음). |
| 영어 전환 | 머리글 EN / 한 | 화면 문구를 영어로 바꿔요. 사건과 진술, 판결문은 쓰인 언어 그대로예요. |
| 단축키 | `?` | Space 재생/멈춤, → 다음, Home 처음부터. 휴대폰에서는 왼쪽으로 밀면 다음 장면이에요. |

## 비용과 안전

- 재판 한 번은 `claude` 호출 8번(배심원 3명)에서 17번(12명)이에요. 질문은 하나에 한 번이에요. 모두 내 Claude 요금제
  사용량에서 빠져요.
- 서버는 이 컴퓨터(`127.0.0.1`)에서만 열려요. 다른 주소로 온 요청과 페이지 토큰이 없는 요청은 거절해요.
- 웹에서 부르는 `claude -p`는 도구를 모두 끈 채(`--tools ""`) 재판 기록만 받아서 답해요. 파일을 읽거나 명령을
  실행하지 않아요.
- 쓰는 파일은 실행한 폴더의 `.court/` 안뿐이에요. `.court/`는 `.gitignore`에 들어 있어 재판 기록이 저장소에
  올라가지 않아요.

## 화면 코드 구조

법정 화면은 빌드 도구 없이 평범한 파일로 나뉘어 있어요. 고치는 사람도 쓰는 사람도 Node.js가 필요 없어요.

```text
skills/court/web/
  index.html            화면 뼈대
  styles/               tokens · base · layout · header · tools · stage · characters · bubble
                        controls · dialog · ask · transcript · motion · responsive · print
  js/
    main.js             시작점: 데이터 읽기, 화면 조립, 기능 연결
    types.js            JSDoc 타입 (실행에는 쓰이지 않아요)
    core/               state · constants · dom · clock · markdown · prefs(브라우저 설정) · i18n(한/영 문구)
    header/             제목, 진행 단계, LIVE 표시
    stage/              sprite(픽셀 캐릭터) · cast(자리와 걷기) · bubble(말풍선) · effects(팻말·판사봉·도장) · layout · pick(캐릭터 클릭)
    player/             scenes(재판 기록 → 장면) · player(재생) · controls(버튼·키) · timeline(장면 막대)
    transcript/         messages(기록창 메시지) · intro(첫 카드)
    live/               api · poll(실시간 반영) · status · draft(작성 중 초안) · questions(질문) · chips(추천 질문)
                        newCase(새 사건) · trials(지난 재판) · compare(비교) · retrial(재심) · cost(비용·시간)
    ui/                 theme · help · print · sound · swipe · share(평결 이미지) · lang(EN / 한)
```

`court.py`가 페이지를 보낼 때 `styles/`를 `<style>`로 붙이고, `js/`의 모듈을 의존 순서대로 이어 붙여 스크립트 하나로
만들어요. 저장되는 `trial.html`도 같은 방식이라 파일 하나로 열려요. 모듈을 고칠 때는 두 가지만 지켜 주세요.

- `import { a, b } from "./x.js";`처럼 이름을 골라 가져오고, `export function / const / let / class`로 내보내요.
- 이어 붙이면 모든 모듈이 한 범위를 쓰므로, 최상위 이름이 다른 모듈과 겹치면 안 돼요. 테스트가 이걸 확인해요.
- 화면 문구는 `core/i18n.js`에 한국어와 영어를 함께 넣고 `t("키")`나 `data-i18n="키"`로 써요. 쓰는 키가 사전에 다
  있는지도 테스트가 확인해요.

`court.py serve`를 켜 둔 채 파일을 고치고 새로고침하면 바로 반영돼요. VS Code에서는 `web/jsconfig.json` 덕분에 JSDoc 타입
검사가 돼요.

## 시험한 범위

- Windows 11(한국어), Python 3.13에서 시험했어요. macOS와 Linux에서는 아직 시험하지 않았어요.
- 진짜 `claude`로 웹 접수 재판(배심원 3명)을 끝까지 돌려 봤어요. 질문 답변은 가짜 `claude`로만 확인했어요.
- 짧은 시스템 프롬프트, `haiku`/`sonnet` 모델 지정, 스트리밍은 진짜 `claude` 호출로 하나씩 확인했어요. 초안 표시와
  역할별 모델이 들어간 웹 재판 전체 흐름은 가짜 `claude`로 확인했어요.
- `claude -p`끼리는 프롬프트 앞부분이 같아도 캐시를 나눠 쓰지 못한다는 것도 재 봤어요. 그래서 공통 기록을 앞에 두는
  방식은 넣지 않았어요.
- 화면 부가 기능은 각각 브라우저에서 확인했어요. 재심과 예상 남은 시간은 가짜 `claude` 서버에서 재판을 끝까지 돌려
  확인했고, 질문 칩과 평결 이미지는 실제 요청이나 내려받기 대신 페이지 안에서 가로채 확인했어요. 소리는 오류 없이
  재생되는 것까지만 확인했어요.
- 단위 테스트:

```bash
python3 -m unittest discover -s tests
```

## 알아 둘 것

- 법률, 재무, 전문 조언이 아니에요. 배심원은 사람이 아니라 언어 모델이니, 평결은 "구조를 갖춘 두 번째 의견"으로 읽어 주세요.
- Anthropic이 만든 것이 아니에요. 법정 화면의 픽셀 캐릭터는 이 저장소에서 직접 그린 팬 디자인이고, Anthropic과는 관계가 없어요.

## 출처 표기

원작자의 요청에 따라 영상이나 글에서 소개할 때는 이렇게 적어 주세요.

```text
/court skill by Alex Chen (@nocodealex): github.com/alexyc9381/court-skill
```

모든 평결문 끝에도 같은 출처가 붙어 있어요.

## 지우기

```bash
rm -rf ~/.claude/skills/court
```

---

## English

A modified version of [alexyc9381/court-skill](https://github.com/alexyc9381/court-skill) by Alex Chen (MIT). The trial
itself is unchanged. This version adds:

- **UTF-8 everywhere.** Upstream reads files with the OS default encoding, which crashes on non-ASCII case
  files on Windows with a non-UTF-8 locale (for example Korean, cp949).
- **A courtroom page** (`skills/court/web/`): pixel characters walk to the lectern, jurors raise vote
  signs, the gavel falls. `render` saves a replay next to `VERDICT.md`. The page is plain files with no
  build step: stylesheets in `web/styles/` and ES modules by feature in `web/js/` (core, header, stage,
  player, transcript, live). `court.py` inlines the CSS and joins the modules into one script when it
  serves or saves the page, so neither users nor contributors need Node.js.
- **`court.py serve`**: a local server (127.0.0.1 only, token-checked) that follows the trial live, takes
  questions for any participant, and can open a new case from the page. Page-filed trials and questions run
  through tool-less `claude -p` calls, so they need the `claude` CLI logged in.
- **`court.py run`**: run the latest trial headless with `claude -p`.
- **Faster, lighter page-filed trials.** Calls stream, so statements, the judgment and question answers
  show as drafts while they are written. They use a short system prompt in place of Claude Code's default
  one (about 9,100 tokens less per call), `--jury-model` (or the dialog) runs jurors on a faster model,
  `--parallel` sets how many calls run at once, and runner.json records each call's time and tokens.
- **Page extras**: a scene timeline, click-a-character, suggested questions, past trials with a
  side-by-side comparison, a retrial button (conditions for acquittal attached, same jury), a cost and
  time panel with an estimate of the time left, a vote map by juror group, verdict image export,
  print layout, light/dark switch, optional sound effects and an English page.
- Sub-agents are told to write in the language of the case file.

The page text is Korean, with an English switch (EN). Tested on Windows 11 only. Not made by or affiliated with Anthropic; the pixel
characters are this repository's own fan design.
