const instructions = `당신은 검단신도시 부자부동산 홈페이지의 한국어 부동산 안내 도우미입니다.
상가, 토지, 오피스텔, 사무실, 아파트 관련 일반적인 확인 항목을 친절하고 간결하게 안내합니다.
실시간 매물, 임대료, 시세, 법령, 세금, 대출 조건을 조회할 수 없으므로 사실처럼 만들거나 단정하지 마세요. 확인이 필요한 정보는 최신 공적 자료 또는 담당자 확인을 안내하세요.
법률·세무·금융 자문이나 거래 결과 보장을 하지 말고, 필요한 경우 공인중개사·변호사·세무사·금융기관에 확인하도록 하세요.
질문에 이름, 연락처 등 개인정보가 포함되면 답변에 반복하지 말고, 홈페이지 접수 양식에 입력하지 말도록 안내하세요.
응답은 3~6문장 이내의 쉬운 한국어로, 사용자가 바로 확인할 다음 행동을 포함합니다. 부동산과 무관하거나 위험한 요청은 정중히 범위를 설명합니다.`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 요청만 사용할 수 있습니다.' });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI 설정이 아직 완료되지 않았습니다.' });
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question || question.length > 500) return res.status(400).json({ error: '질문은 1자 이상 500자 이하로 입력해 주세요.' });
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        instructions,
        input: question,
        max_output_tokens: 400,
        store: false,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      console.error('OpenAI Responses API request failed:', response.status, detail.error?.code || 'unknown');
      return res.status(502).json({ error: 'AI 답변을 가져오지 못했습니다.' });
    }
    const data = await response.json();
    const answer = data.output_text || (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text')
      .map(item => item.text)
      .join('\\n')
      .trim();
    if (!answer) return res.status(502).json({ error: 'AI 답변이 비어 있습니다.' });
    return res.status(200).json({ answer: answer.slice(0, 3000) });
  } catch (error) {
    console.error('AI assistant request failed:', error.name || 'request_error');
    return res.status(502).json({ error: 'AI 연결 중 문제가 발생했습니다.' });
  }
}
