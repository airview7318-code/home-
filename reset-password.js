(() => {
  const form = document.querySelector('#reset-form');
  const message = document.querySelector('#reset-message');
  const submit = document.querySelector('#reset-submit');
  const params = new URLSearchParams(location.hash.slice(1));
  const query = new URLSearchParams(location.search);
  const token = params.get('access_token') || query.get('access_token');
  const type = params.get('type') || query.get('type');
  const config = window.BUJA_CONFIG || {};
  const base = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const anon = config.supabaseAnonKey || '';

  function setMessage(text, kind = '') {
    message.textContent = text;
    message.className = `reset-message${kind ? ` ${kind}` : ''}`;
  }

  if (!token || (type && type !== 'recovery')) {
    setMessage('재설정 링크가 만료되었거나 올바르지 않습니다. 관리자에게 새 재설정 메일을 요청해 주세요.', 'error');
    return;
  }
  if (!base || !anon) {
    setMessage('인증 설정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    return;
  }

  form.hidden = false;
  setMessage('새 비밀번호를 두 번 입력해 주세요.');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const password = form.elements.password.value;
    const confirmation = form.elements.confirmPassword.value;
    if (password.length < 8) return setMessage('비밀번호는 8자 이상으로 입력해 주세요.', 'error');
    if (password !== confirmation) return setMessage('두 비밀번호가 서로 다릅니다.', 'error');
    submit.disabled = true;
    setMessage('비밀번호를 변경하고 있습니다…');
    try {
      const response = await fetch(`${base}/auth/v1/user`, {
        method: 'PUT',
        headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.msg || result.message || '비밀번호 변경에 실패했습니다.');
      }
      form.hidden = true;
      history.replaceState(null, '', location.pathname);
      setMessage('비밀번호를 변경했습니다. 관리자 로그인 페이지에서 새 비밀번호로 로그인해 주세요.', 'success');
    } catch (error) {
      setMessage(`${error.message} 새 재설정 메일이 필요하면 관리자에게 요청해 주세요.`, 'error');
      submit.disabled = false;
    }
  });
})();
