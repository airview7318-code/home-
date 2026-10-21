(()=>{
  const byId=id=>document.getElementById(id);
  const won=value=>`${Math.round(value).toLocaleString('ko-KR')}원`;
  const feeKind=byId('fee-property'),feeDeal=byId('fee-deal');
  if(feeKind&&feeDeal){
    const syncFeeFields=()=>{
      const lease=feeDeal.value==='lease';
      byId('fee-sale-row').hidden=lease;
      byId('fee-rent-row').hidden=!lease;
      byId('fee-rate-note').textContent=feeKind.value==='other'?'주택 외 부동산은 중개보수 상한 0.9% 이내에서 협의합니다.':feeKind.value==='officetel'?'85㎡ 이하이며 전용 부엌·화장실·목욕시설을 갖춘 오피스텔 기준입니다.':'인천광역시 주택 중개보수 상한요율을 적용합니다.';
    };
    feeKind.addEventListener('change',syncFeeFields);feeDeal.addEventListener('change',syncFeeFields);syncFeeFields();
    byId('fee-calc').addEventListener('click',()=>{
      const isLease=feeDeal.value==='lease',kind=feeKind.value;
      let amount=isLease?(Number(byId('fee-deposit').value||0)*10000+Number(byId('fee-rent').value||0)*10000*(Number(byId('fee-deposit').value||0)*10000+Number(byId('fee-rent').value||0)*1000000<50000000?70:100)):Number(byId('fee-price').value||0)*10000;
      if(!amount||amount<0){byId('fee-result').textContent='거래 금액을 입력해 주세요.';return;}
      let rate,cap=Infinity,label;
      if(kind==='house'){
        const table=isLease?[[50000000,.005,200000],[100000000,.004,300000],[600000000,.003,Infinity],[1200000000,.004,Infinity],[1500000000,.005,Infinity],[Infinity,.006,Infinity]]:[[50000000,.006,250000],[200000000,.005,800000],[900000000,.004,Infinity],[1200000000,.005,Infinity],[1500000000,.006,Infinity],[Infinity,.007,Infinity]];
        [rate,cap]=table.find(([limit])=>amount<limit).slice(1);label=`상한 ${Number((rate*100).toFixed(2))}%`;
      }else if(kind==='officetel'){rate=isLease ? 0.004 : 0.005;label=`상한 ${rate*100}%`}
      else{rate=.009;label='협의 상한 0.9% 이내'}
      const ceiling=Math.min(amount*rate,cap),vat=byId('fee-vat').checked?ceiling*.1:0;
      const formatMoney=value=>won(value);
      byId('fee-result').innerHTML=`<strong>${formatMoney(ceiling+vat)}</strong><span>1인 기준 중개보수 상한 ${formatMoney(ceiling)} · ${label}${vat?` · 부가세 가정 ${formatMoney(vat)}`:''}</span><small>거래금액 기준 ${formatMoney(amount)} · 실제 보수는 상한 이내에서 협의합니다.</small>`;
    });
  }

  const taxType=byId('tax-type');
  if(taxType){
    taxType.addEventListener('change',()=>{byId('tax-one-home-row').hidden=taxType.value!=='home';byId('tax-land-row').hidden=taxType.value!=='land';});
    byId('tax-calc').addEventListener('click',()=>{
      const assessed=Number(byId('tax-value').value||0)*10000;
      if(!assessed||assessed<0){byId('tax-result').textContent='공시가격 또는 시가표준액을 입력해 주세요.';return;}
      let ratio=.7,base,tax=0;
      if(taxType.value==='home'){
        const oneHome=byId('tax-one-home').checked&&assessed<=900000000;
        ratio=oneHome?(assessed<=300000000 ? .43 : assessed<=600000000 ? .44 : .45):.6;
        base=assessed*ratio;
        if(oneHome)tax=base<=60000000?base*.0005:base<=150000000?30000+(base-60000000)*.001:base<=300000000?120000+(base-150000000)*.002:420000+(base-300000000)*.0035;
        else tax=base<=60000000?base*.001:base<=150000000?60000+(base-60000000)*.0015:base<=300000000?195000+(base-150000000)*.0025:570000+(base-300000000)*.004;
      }else{
        base=assessed*.7;
        if(taxType.value==='building')tax=base*.0025;
        else if(byId('tax-land-type').value==='general')tax=base<=50000000?base*.002:base<=100000000?100000+(base-50000000)*.003:250000+(base-100000000)*.005;
        else tax=base<=200000000?base*.002:base<=1000000000?400000+(base-200000000)*.003:2800000+(base-1000000000)*.004;
      }
      const education=tax*.2,urban=byId('tax-urban').checked?base*.0014:0,total=tax+education+urban;
      byId('tax-result').innerHTML=`<strong>${won(total)}</strong><span>재산세 본세 ${won(tax)} · 지방교육세 약 ${won(education)} · 도시지역분 ${won(urban)}</span><small>과세표준 ${won(base)} · 시가표준액 적용 비율 ${(ratio*100).toFixed(0)}%</small>`;
    });
  }

  const chat=byId('advisor-form'),log=byId('advisor-log');
  if(chat&&log){
    const answerFor=question=>{
      const q=question.replace(/\s/g,'').toLowerCase();
      if(/중개보수|복비|수수료/.test(q))return '매매·전월세·상가·토지·오피스텔에 따라 상한요율이 달라요. 위 중개보수 계산기에서 거래 유형과 금액을 넣으면 1인 기준 상한을 볼 수 있습니다. 최종 보수는 상한 안에서 협의합니다.';
      if(/재산세|보유세|세금/.test(q))return '재산세는 매년 6월 1일 현재 소유자와 공시가격·시가표준액, 과세 구분에 따라 달라집니다. 위 재산세 계산기는 기본 세율로 추정하므로 고지액은 위택스나 관할 구청에서 확인해 주세요.';
      if(/상가|점포|창업|공실/.test(q))return '상가는 유동인구만 보기보다 배후세대, 업종 구성, 전면·가시성, 주차, 관리비, 렌트프리와 공실 기간을 같이 확인하는 게 좋습니다. 희망 업종·예산·면적을 알려주시면 상담 요청으로 남겨 주세요.';
      if(/토지|건축|용도/.test(q))return '토지는 지목만으로 건축 가능 여부를 판단하기 어렵습니다. 용도지역·지구단위계획, 도로 접면, 건폐율·용적률, 기반시설과 필지 조건을 함께 확인해야 합니다. 블로그 토지 글이나 상담으로 필지별 확인을 권해요.';
      if(/오피스텔|사무실|업무/.test(q))return '오피스텔은 주거용/업무용 실제 사용, 전용면적·관리비·주차·전입 가능 여부를 확인해 주세요. 사무실은 업종 인허가, 전력·냉난방, 원상복구 범위와 관리비 포함 항목도 계약 전에 살펴야 합니다.';
      if(/대출|금리|이자/.test(q))return '대출 한도와 금리는 소득·신용·담보평가·금융기관 정책에 따라 달라져요. 이 도우미는 대출 승인을 확정하거나 금융상품을 추천하지 않습니다. 은행에 최신 조건을 확인하고 필요하면 매물 조건을 함께 정리해 드릴게요.';
      return '원하는 지역, 부동산 종류, 예산, 매입·임대 목적을 알려주시면 확인할 항목을 정리해 드릴게요. 복잡한 권리·세금·법률 판단은 공인중개사 또는 해당 전문가와 확인해 주세요.';
    };
    const addMessage=(text,role)=>{const p=document.createElement('p');p.className=`advisor-message ${role}`;p.textContent=text;log.append(p);log.scrollTop=log.scrollHeight;return p;};
    chat.addEventListener('submit',async event=>{event.preventDefault();const input=byId('advisor-question'),submit=chat.querySelector('button[type="submit"]'),question=input.value.trim();if(!question||submit.disabled)return;addMessage(question,'user');input.value='';submit.disabled=true;submit.textContent='답변 작성 중…';const pending=addMessage('질문을 확인하고 있습니다.','assistant');
      try{
        const response=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal:AbortSignal.timeout(25000)});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||'답변을 불러오지 못했습니다.');
        pending.textContent=data.answer;
      }catch{
        pending.textContent=`AI 연결을 사용할 수 없어 기본 안내로 답변드립니다. ${answerFor(question)}`;
      }finally{submit.disabled=false;submit.textContent='질문하기';log.scrollTop=log.scrollHeight;}
    });
    document.querySelectorAll('[data-advisor-prompt]').forEach(button=>button.addEventListener('click',()=>{byId('advisor-question').value=button.dataset.advisorPrompt;chat.requestSubmit();}));
  }

  const faqContent={
    '관리비':['관리비 고지서의 총액뿐 아니라 포함 항목과 별도 사용료를 구분해 확인하세요.','공용관리비·전기·수도·냉난방·주차·인터넷의 포함 여부와 최근 계절별 변동 내역을 확인합니다.','상가라면 공용관리비 산정 기준, 부가세, 공실 시 부담 주체도 계약서와 관리규약에 따라 확인하세요.'],
    '상권':['상권은 시간대·요일별 유동 흐름과 실제 이용 목적을 함께 살펴보는 게 좋습니다.','배후 주거·학교·업무시설, 업종 구성, 경쟁 점포, 접근성, 주차와 가시성을 현장에서 확인하세요.','상가의 실제 매출이나 유동인구를 보장하는 자료는 아니며, 업종 인허가 및 임대 조건은 별도로 확인해야 합니다.'],
    '보증금':['월 부담은 임대료 외 관리비와 별도 사용료까지 더해 비교하세요.','보증금 반환 조건, 계약 기간, 월세 납부일, 연체 시 조항을 계약서에 명확히 적고, 전세·월세 보증 관련 제도는 주택 유형과 요건을 확인하세요.','상가 임대차는 환산보증금·지역·계약 내용에 따라 적용 기준이 달라질 수 있습니다.'],
    '계약':['계약 당사자와 소유자, 등기부 권리관계, 건축물대장 용도, 실제 점유·인도 조건을 확인하세요.','계약금·중도금·잔금 일정과 특약, 관리비·수선 책임 및 계약 해제 관련 조건을 서면으로 남기세요.','공적 장부는 발급 시점 기준으로 다시 확인하고, 권리·법률 문제는 전문가와 상담하세요.'],
    '집보기':['집을 볼 때는 낮과 저녁 등 가능한 시간대를 나누어 채광·소음·냄새·통풍·주변 동선을 확인하세요.','누수 흔적, 창호·문 잠금, 수압·배수, 난방·환기, 옵션의 작동 여부를 확인하고 임대인과 합의한 수선 내용은 기록하세요.','사진 촬영은 거주자 동의를 먼저 받고, 방문 당시 상태가 이후에도 같다고 단정할 수 없습니다.'],
    '계약 전':['신분과 대리권을 확인하고, 등기사항증명서·건축물대장 등 거래에 필요한 자료를 최신 발급본으로 확인하세요.','용도와 실제 사용이 맞는지, 위반건축물 표기·권리 제한·세금 및 관리비 체납 관련 확인이 필요한지 살펴보세요.','잔금 지급 전에도 권리 변동과 인도 조건을 다시 확인하고 확인 결과를 계약 서류에 반영하세요.'],
    '돈과 관리비':['초기 비용은 계약금·중도금·잔금과 중개보수·세금·이사 비용을 나눠 계산하세요.','월 비용은 임대료, 관리비, 공과금, 주차료 등 실제 부담 항목을 포함해 비교하는 게 좋습니다.','대출 가능액이나 보증 가입은 개인별 심사와 대상 요건이 있으므로 금융기관·보증기관에서 확인하세요.'],
    '특약':['특약은 누가, 무엇을, 언제까지, 어떤 방식으로 이행하는지 구체적으로 작성하는 편이 좋습니다.','시설 인수, 수선 범위, 잔금 전 권리 변동, 인도일, 관리비 정산 등 당사자 합의 사항을 빠짐없이 기록하세요.','불명확하거나 권리·법률 효과가 큰 문구는 서명 전에 법률 전문가에게 검토받으세요.'],
    '잔금과 입주':['잔금 직전 등기사항과 당사자 계좌를 확인하고, 열쇠·시설·비품 인수 상태를 함께 기록하세요.','전입신고·확정일자·사업자등록·인허가 등 필요한 절차는 거래 유형과 사용 목적에 맞춰 관할 기관에 확인하세요.','잔금 지급과 실제 인도 시점, 관리비 정산 기준을 계약서 및 인수인계 기록으로 남기세요.'],
    '상가 특약':['상가 임대차에서는 업종·용도 적합성, 인허가 가능 여부, 렌트프리·시설 인수 범위를 먼저 확인하세요.','수선 책임, 간판·내부 공사 승인, 원상회복 기준, 관리비 산식, 갱신 조건과 인도 시점을 문서로 협의하세요.','임대차보호법 적용은 환산보증금과 구체적 상황에 따라 달라질 수 있어 최신 법령과 전문가 확인이 필요합니다.']
  };
  const faqDialog=byId('faq-dialog');
  if(faqDialog){
    document.querySelectorAll('[data-faq-topic]').forEach(button=>button.addEventListener('click',()=>{
      const topic=button.dataset.faqTopic,items=faqContent[topic]||faqContent['계약'];
      byId('faq-dialog-title').textContent=topic==='집보기'?'집을 보러 갈 때':topic==='돈과 관리비'?'돈과 관리비':topic==='상가 특약'?'상가를 계약할 때':topic==='계약 전'?'계약하기 전':topic;
      const body=byId('faq-dialog-body');body.replaceChildren();const heading=document.createElement('h3');heading.textContent='확인할 내용';body.append(heading);const list=document.createElement('ul');for(const item of items){const li=document.createElement('li');li.textContent=item;list.append(li)}body.append(list);faqDialog.showModal();
    }));
    byId('faq-dialog').querySelector('.faq-close').addEventListener('click',()=>faqDialog.close());
    faqDialog.addEventListener('click',event=>{if(event.target===faqDialog)faqDialog.close()});
  }
})();
