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
| `court.py serve [--port P] [--model M]` | 실시간 법정 서버. 새 사건 접수와 질문을 받아요. |
| `court.py run [--model M]` | `init`으로 연 가장 최근 재판을 `claude -p`로 끝까지 진행해요. |
| `court.py render` | 평결을 세어 `VERDICT.md`와 `trial.html`을 써요. |
| `court.py plan / init / next / prompts / check / tally` | 원작과 같은, 재판 진행용 장부 명령이에요. |

`claude`가 PATH에 없다면 `COURT_CLAUDE` 환경 변수에 실행 파일 경로를 적어 주세요.

## 비용과 안전

- 재판 한 번은 `claude` 호출 8번(배심원 3명)에서 17번(12명)이에요. 질문은 하나에 한 번이에요. 모두 내 Claude 요금제
  사용량에서 빠져요.
- 서버는 이 컴퓨터(`127.0.0.1`)에서만 열려요. 다른 주소로 온 요청과 페이지 토큰이 없는 요청은 거절해요.
- 웹에서 부르는 `claude -p`는 도구를 모두 끈 채(`--tools ""`) 재판 기록만 받아서 답해요. 파일을 읽거나 명령을
  실행하지 않아요.
- 쓰는 파일은 실행한 폴더의 `.court/` 안뿐이에요. `.court/`는 `.gitignore`에 들어 있어 재판 기록이 저장소에
  올라가지 않아요.

## 시험한 범위

- Windows 11(한국어), Python 3.13에서 시험했어요. macOS와 Linux에서는 아직 시험하지 않았어요.
- 진짜 `claude`로 웹 접수 재판(배심원 3명)을 끝까지 돌려 봤어요. 질문 답변은 가짜 `claude`로만 확인했어요.
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
- **A courtroom page** (`skills/court/trial.html`): pixel characters walk to the lectern, jurors raise vote
  signs, the gavel falls. `render` saves a replay next to `VERDICT.md`.
- **`court.py serve`**: a local server (127.0.0.1 only, token-checked) that follows the trial live, takes
  questions for any participant, and can open a new case from the page. Page-filed trials and questions run
  through tool-less `claude -p` calls, so they need the `claude` CLI logged in.
- **`court.py run`**: run the latest trial headless with `claude -p`.
- Sub-agents are told to write in the language of the case file.

The page text is Korean. Tested on Windows 11 only. Not made by or affiliated with Anthropic; the pixel
characters are this repository's own fan design.
