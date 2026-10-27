# 네이버 톡톡 상담 자동 전달 설정

## 동작 방식

1. 방문자가 홈페이지 상담 양식을 한 번 제출합니다.
2. 동의한 상담 내용은 기존처럼 Supabase 문의함에 저장되고, 이메일에는 요청 유형과 접수 시각만 전달됩니다.
3. 홈페이지가 톡톡을 새 탭으로 열며, 주소에는 임의 생성된 1회용 요청 토큰만 붙습니다. 이름·연락처·상담 내용은 URL에 넣지 않습니다.
4. 네이버 톡톡 Chatbot API가 `open` 웹훅으로 요청 토큰과 해당 대화 사용자를 서버에 알립니다.
5. 서버가 동의·접수 시각·중복 전송 여부를 확인한 뒤 접수 요약을 톡톡을 연 방문자 본인에게 보냅니다. Naver 사용자 ID와 인증 정보는 서버 밖으로 내보내지 않습니다. 문의 원본은 관리자 센터에 저장되며, 이메일에는 요청 유형과 접수 시각만 전송됩니다. 이 API는 고객의 계정으로 사장님에게 메시지를 위조 발송하지 않습니다.

## 필요한 설정

### 1. Supabase SQL 적용

Supabase Dashboard에서 부자부동산 프로젝트의 **SQL Editor**를 열고 `supabase/migrations/20261027_talktalk_inquiry_bridge.sql` 내용을 한 번 실행합니다. 문의 테이블에 토큰과 전송 상태 열이 추가됩니다. 문의 내용의 공개 조회 정책은 추가하지 않습니다.

### 2. 톡톡 Chatbot API 활성화

네이버 톡톡 파트너센터에서 부자부동산 계정을 선택하고 **개발자 도구 → 챗봇 API 설정**으로 이동합니다. 사용 신청·승인 후 **보내기 API Authorization**을 생성합니다.

### 3. Vercel 비밀 환경변수 설정

Vercel의 `buja-real-estate` 프로젝트에서 **Settings → Environment Variables**에 아래 값을 Production 및 Preview 환경으로 추가합니다.

- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 프로젝트의 비밀 서비스 키. `config.js`에는 절대 넣지 않습니다.
- `NAVER_TALKTALK_AUTHORIZATION`: 톡톡 파트너센터에서 생성한 보내기 API Authorization 값.
- `NAVER_TALKTALK_WEBHOOK_TOKEN`: 길고 무작위인 별도 문자열. 톡톡 인증값과 같은 값을 재사용하지 않습니다.

비밀값은 채팅, 코드, GitHub 또는 공개 환경변수에 올리지 않습니다. Vercel에 저장한 뒤에는 값을 다시 공개하지 않아도 됩니다.

### 4. 네이버 웹훅 등록

톡톡의 **챗봇 API 설정 → Webhook**에 다음 주소를 등록합니다. `<WEBHOOK_TOKEN>`은 Vercel에 저장한 `NAVER_TALKTALK_WEBHOOK_TOKEN`과 같은 값으로 바꿉니다.

`https://buja-real-estate.vercel.app/api/talktalk?token=<WEBHOOK_TOKEN>`

Webhook 이벤트에는 최소 `open`을 선택합니다. 메시지 수신 이벤트까지 사용할 필요는 없습니다. 네이버의 테스트 이벤트를 보낸 뒤 성공 응답을 확인합니다.

### 5. 연결 켜고 배포

비밀 환경변수와 SQL, Webhook이 모두 준비된 후 `config.js`의 `talktalkBridgeEnabled`를 `true`로 바꾸고 배포합니다. 준비가 끝나기 전에는 자동 전송을 켜지 않습니다.

### 6. 실제 접수 시험

실제 고객정보 대신 운영자 본인의 시험 연락처와 가짜 조건을 입력합니다. 제출하면 Supabase/관리자 화면에 문의가 한 건 저장되고, 이메일에는 요청 유형과 시각만 오며, 방문자 본인의 톡톡 대화에 접수 요약이 한 번만 안내되는지 확인합니다. 사무소는 관리자 센터에서 원문을 확인합니다. 동의하지 않은 제출, 만료된 요청, 중복 웹훅은 톡톡으로 보내지 않습니다.

## 주의

- 네이버 Chatbot API 활성화 및 Webhook 설정은 톡톡 파트너센터에서 계정 소유자가 마쳐야 합니다.
- 환경변수나 SQL 적용 전에는 `talktalkBridgeEnabled`를 `true`로 켜지 않습니다.
- TalkTalk 메시지 전송 오류가 나더라도 Supabase 접수와 기존 이메일 알림은 유지됩니다. 관리자 센터에서 원본 문의를 확인할 수 있습니다.
- Naver TalkTalk의 사용자 식별값은 서버에서만 사용하며 로그에 저장하지 않습니다.
