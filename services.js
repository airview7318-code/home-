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
      const ceiling=Math.min(amount*rate,cap),vat=ceiling*.1;
      const formatMoney=value=>won(value);
      byId('fee-result').innerHTML=`<strong>${formatMoney(ceiling+vat)}</strong><span>1인 기준 중개보수 상한 ${formatMoney(ceiling)} · ${label} · 부가세 10% 추정 ${formatMoney(vat)}</span><small>거래금액 기준 ${formatMoney(amount)} · 실제 보수는 상한 이내에서 협의합니다.</small>`;
    });
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
    '상가 특약':['상가 임대차에서는 업종·용도 적합성, 인허가 가능 여부, 렌트프리·시설 인수 범위를 먼저 확인하세요.','수선 책임, 간판·내부 공사 승인, 원상회복 기준, 관리비 산식, 갱신 조건과 인도 시점을 문서로 협의하세요.','임대차보호법 적용은 환산보증금과 구체적 상황에 따라 달라질 수 있어 최신 법령과 전문가 확인이 필요합니다.'],
    '운영시간':['전화 상담은 월요일부터 토요일까지 오전 10시부터 오후 7시까지 가능합니다.','매주 일요일은 정기 휴무입니다. 방문 상담은 오시기 전에 전화로 시간을 확인해 주세요.','전화 상담: 032-566-8949']
  };
  const faqDialog=byId('faq-dialog');
  if(faqDialog){
    document.querySelectorAll('[data-faq-topic]').forEach(button=>button.addEventListener('click',()=>{
      const topic=button.dataset.faqTopic,items=faqContent[topic]||faqContent['계약'];
      byId('faq-dialog-title').textContent=topic==='보증금'?'보증금과 월세 부담은 어떻게 되나요?':topic==='집보기'?'집을 보러 갈 때':topic==='돈과 관리비'?'돈과 관리비':topic==='상가 특약'?'상가를 계약할 때':topic==='계약 전'?'계약하기 전':topic==='운영시간'?'전화 상담 운영시간':topic;
      const body=byId('faq-dialog-body');body.replaceChildren();const heading=document.createElement('h3');heading.textContent='확인할 내용';body.append(heading);const list=document.createElement('ul');for(const item of items){const li=document.createElement('li');li.textContent=item;list.append(li)}body.append(list);faqDialog.showModal();
    }));
    byId('faq-dialog').querySelector('.faq-close').addEventListener('click',()=>faqDialog.close());
    faqDialog.addEventListener('click',event=>{if(event.target===faqDialog)faqDialog.close()});
  }
})();

