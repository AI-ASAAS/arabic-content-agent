# The Asaas robot assistant

The floating robot at the bottom of the page opens a small glass chat window, which takes the
full screen on phones. The full waving robot is the launcher and welcomes the user. Inside the
chat only its face shows, in four moods: `smile` in the header, `happy` on replies,
`waiting` while typing, and `celebrate` when a reply carries attachments. The greeting uses
the first name: «مساء الخير يا أيوب».

The kit has the **interface only**. The site provides an `ask` function that calls its own
server.

## Mount it

```tsx
import { AssistantWidget, type AssistantMessage } from './asaas-ui';

<AssistantWidget
  user={{ id: me.id, displayName: me.displayName }}
  ask={(messages: AssistantMessage[]) => api.post('/assistant', { messages })} // → { reply, attachments? }
  title="مساعد أساس"
  subtitle="اسأل عن بياناتك"
  suggestions={['كم الرصيد الآن؟', 'من لم يدفع هذا الشهر؟']}
  intro="اسأل عن أي شيء في الموقع وسأجيبك من بياناته."
  disclaimer="يجيب من بيانات الموقع فقط وقد يخطئ."
  renderAttachment={(a) => <MyConfirmCard proposal={a} />} // optional
/>
```

- Mount it once, inside the signed-in layout, so `user` is known. The chat is kept in
  `sessionStorage` per user id. Clear `sessionStorage` on sign-out so the next person on the
  same browser doesn't see it.
- Only the **last 8 messages** are sent. Long threads made smaller models drift into earlier
  answers.
- Errors thrown by `ask` show inline with «إعادة المحاولة» (retry). Throw an `Error` with a
  readable message in the page language. The widget's own texts follow `<html lang>` (see `kitText`).
- Show the widget only when the server has the assistant switched on (for example, a
  `GET /assistant/status`). Otherwise the robot leads nowhere.

## Server side

The endpoint, tools, permissions, limits and the lessons from the Asaas fund are in the `ai` skill: [assistant-pattern.md](../../../ai/references/assistant-pattern.md) (installed as `ai/references/assistant-pattern.md`). The widget expects `POST /api/assistant { messages }` → `{ reply, attachments }`, 429 when over the limit and 503 when the model is unavailable.
