/* AlphaCatcher — product common interactions.
   원본 목업 JS에서 (1) 전역 화면 전환 toolbar 로직 제거→파일 간 링크로 대체,
   (2) 테마 전환 컨트롤 제거, (3) 단독 페이지 대비 null 가드 추가. 화면 내부 상호작용은 원본 유지. */
(function(){
  var page=document.getElementById('page');

  // 독립 페이지: 전역 화면 전환(목업 toolbar) 제거.
  // data-screen은 분리된 정적 파일 간 링크로 동작(같은 화면이면 스크롤 상단 이동).
  var ROUTES={home:'home-my-reports.html',detail:'report-detail.html',profile:'profile-self.html',
    uprofile:'profile-user.html',wiki:'wiki.html',kb:'library.html',auth:'auth-signup-choice.html',
    onboard:'onboarding.html',settings:'settings.html',notif:'notifications.html',
    saved:'saved.html',search:'search.html',
    feed:'home-feed.html','onboard-pick':'onboarding.html',
    // 비로그인 guest variant 간 이동 (variants/*-guest.html 전용 — Final 목업은 이 키를 쓰지 않음)
    'feed-guest':'../variants/home-feed-guest.html','detail-guest':'../variants/report-detail-guest.html',
    // [Prototype Only] 가입/로그인의 'Google로 계속하기'는 정적 목업 검수용 프로토타입 화면으로 이동합니다.
    // 실제 구현에서는 이 내부 중간 페이지 없이 외부 Google OAuth 계정 선택 화면으로 바로 리다이렉트합니다.
    // 이 화면은 제품 화면 수·Figma Frame·MCP 이관·최종 스크린샷 대상이 아닙니다.
    google:'../prototype/auth-google-redirect.html'};
  function showScreen(t,el){
    var base=document.body.getAttribute('data-route-base')||'';
    // '관심사 다시 고르기': 인터랙션용 onboarding.html(라우트 베이스 없음 + 1단계 뷰 보유)에서는
    // 페이지 이동/새로고침 없이 같은 파일 안에서 1단계 뷰로 복귀 — 선택·직접 추가 상태와
    // 카운트/계속하기 버튼 상태는 DOM에 그대로 남아 있어 자동 유지, History 추가 없음.
    // 정적 Variant(onboarding-done.html, base='../product/')와 그 외 화면은 onboarding.html로 이동.
    if(t==='onboard-pick'&&!base&&document.querySelector('#screen-onboard .ob-view[data-ob-view="pick"]')){
      showOb('pick');window.scrollTo({top:0,behavior:'smooth'});return;
    }
    if(document.getElementById('screen-'+t)){window.scrollTo({top:0,behavior:'smooth'});return;}
    var f=ROUTES[t];
    if(t==='auth'&&el&&el.getAttribute('data-auth')==='login')f='auth-login.html';
    if(f)window.location.href=base+f;
  }
  document.querySelectorAll('[data-screen]').forEach(function(b){
    b.addEventListener('click',function(){showScreen(b.getAttribute('data-screen'),b);});
  });

  // auth sub-views (가입 선택 / 이메일 폼 / 로그인)
  var authBack=document.getElementById('auth-back');
  function showAuth(v){
    document.querySelectorAll('[data-auth-view]').forEach(function(x){x.hidden=(x.getAttribute('data-auth-view')!==v);});
    if(authBack)authBack.classList.toggle('show',v!=='signup');
  }
  document.querySelectorAll('[data-auth]').forEach(function(b){
    b.addEventListener('click',function(){showAuth(b.getAttribute('data-auth'));});
  });

  // 온보딩: 스텝 전환 + 관심사 칩 토글
  // 완료 화면 recap은 1단계의 현재 선택(기본 + 직접 추가, 삭제분 제외)을 DOM 상태로 다시 렌더링.
  // 정적 목업이므로 DB/API/저장소 없음 — 같은 파일 내 전환이라 sessionStorage도 불필요.
  // 정적 Variant(onboarding-done.html)는 pick 전환 버튼이 없어 이 함수가 호출되지 않고 고정 대표 데이터를 유지.
  function renderRecap(){
    var recap=document.querySelector('#screen-onboard .ob-recap');
    var chips=document.querySelectorAll('#screen-onboard .ob-view[data-ob-view="pick"] .chip.on');
    if(!recap||!chips.length)return;
    recap.innerHTML='';
    chips.forEach(function(ch){
      var s=document.createElement('span');s.className='chip on';
      var pl=document.createElement('span');pl.className='pl';s.appendChild(pl);
      var label=ch.textContent.trim();
      s.appendChild(document.createTextNode(label));
      if(ch.querySelector('.rm')){s.title='직접 추가한 관심사';s.setAttribute('aria-label',label+' (직접 추가)');}
      recap.appendChild(s);
    });
  }
  function showOb(v){
    if(v==='done')renderRecap();
    document.querySelectorAll('[data-ob-view]').forEach(function(x){x.hidden=(x.getAttribute('data-ob-view')!==v);});
    var st=document.getElementById('ob-step');
    if(st)st.innerHTML=(v==='pick')?'관심사 선택 · <b>1</b> / 2':'완료 · <b>2</b> / 2';
  }
  document.querySelectorAll('[data-ob]').forEach(function(b){
    b.addEventListener('click',function(){showOb(b.getAttribute('data-ob'));});
  });
  var obNext=document.getElementById('ob-next');
  if(obNext)obNext.addEventListener('click',function(){showOb('done');});
  function obCount(){
    var n=document.querySelectorAll('#screen-onboard .ob-view[data-ob-view="pick"] .chip.on').length;
    var el=document.getElementById('ob-count-n'); if(el)el.textContent=n;
    if(obNext)obNext.classList.toggle('dis',n<1);
  }
  function bindChip(ch){
    ch.addEventListener('click',function(){ch.classList.toggle('on');obCount();});
  }
  document.querySelectorAll('#screen-onboard .chip[data-chip]').forEach(bindChip);

  // 관심사 직접 추가 모달
  var obModal=document.getElementById('ob-modal');
  var obAddBtn=document.getElementById('ob-add-btn');
  var obAddInput=document.getElementById('ob-add-input');
  function obAddConfirm(){
    var v=(obAddInput&&obAddInput.value.trim())||'';
    if(v){
      var s=document.createElement('span');
      s.className='chip on';s.setAttribute('data-chip','');
      var pl=document.createElement('span');pl.className='pl';
      s.appendChild(pl);s.appendChild(document.createTextNode(v));
      var rm=document.createElement('span');rm.className='rm';rm.title='삭제';
      rm.addEventListener('click',function(e){e.stopPropagation();s.remove();obCount();});
      s.appendChild(rm);
      bindChip(s);document.getElementById('ob-added').appendChild(s);obCount();
    }
    obModal.hidden=true;
  }
  if(obAddBtn)obAddBtn.addEventListener('click',function(){
    obModal.hidden=false;
    if(obAddInput){obAddInput.value='';setTimeout(function(){obAddInput.focus();},0);}
  });
  document.querySelectorAll('[data-modal-close]').forEach(function(b){
    b.addEventListener('click',function(){if(obModal)obModal.hidden=true;});
  });
  if(obModal)obModal.addEventListener('click',function(e){if(e.target===obModal)obModal.hidden=true;});
  var obAddOk=document.getElementById('ob-add-ok');
  if(obAddOk)obAddOk.addEventListener('click',obAddConfirm);
  if(obAddInput)obAddInput.addEventListener('keydown',function(e){if(e.key==='Enter')obAddConfirm();});

  // 지식창고: 필터 패널 토글
  var kbfBtn=document.getElementById('kbf-btn'),kbfPanel=document.getElementById('kbf-panel');
  if(kbfBtn)kbfBtn.addEventListener('click',function(){
    kbfPanel.hidden=!kbfPanel.hidden;
    kbfBtn.classList.toggle('on',!kbfPanel.hidden);
  });

  // 지식창고: 보기 방식(리스트/그리드) + 묶기(날짜별/카테고리별)
  document.querySelectorAll('.ks[data-kb-view]').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('.ks[data-kb-view]').forEach(function(x){x.classList.toggle('on',x===b);});
      var l=document.getElementById('kb-list');
      if(l)l.classList.toggle('grid',b.getAttribute('data-kb-view')==='grid');
    });
  });
  document.querySelectorAll('.ks[data-kb-by]').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('.ks[data-kb-by]').forEach(function(x){x.classList.toggle('on',x===b);});
      var v=b.getAttribute('data-kb-by');
      document.querySelectorAll('.kb-by[data-kb-by]').forEach(function(pn){pn.hidden=(pn.getAttribute('data-kb-by')!==v);});
    });
  });

  // 설정: 토글 스위치 (목업)
  document.querySelectorAll('.sw').forEach(function(s){
    s.addEventListener('click',function(){
      s.classList.toggle('on');
      s.setAttribute('aria-checked',s.classList.contains('on')?'true':'false');
    });
  });

  // LLM Wiki: 관심사 상세 수정 모달
  var wkModal=document.getElementById('wk-modal');
  document.querySelectorAll('[data-wm-open]').forEach(function(b){
    b.addEventListener('click',function(){if(wkModal)wkModal.hidden=false;});
  });
  document.querySelectorAll('[data-wm-close]').forEach(function(b){
    b.addEventListener('click',function(){if(wkModal)wkModal.hidden=true;});
  });
  if(wkModal)wkModal.addEventListener('click',function(e){if(e.target===wkModal)wkModal.hidden=true;});

  // 조건 달성 실시간 모달
  var cmModal=document.getElementById('cond-modal');
  document.querySelectorAll('[data-cm-open]').forEach(function(b){
    b.addEventListener('click',function(){if(cmModal)cmModal.hidden=false;});
  });
  document.querySelectorAll('[data-ntab]').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('[data-ntab]').forEach(function(x){x.classList.toggle('on',x===b);});
      var condOnly=(b.getAttribute('data-ntab')==='cond');
      document.querySelectorAll('#screen-notif .ntf').forEach(function(n){n.hidden=condOnly&&!n.classList.contains('cond');});
    });
  });
  var cmGokb=document.getElementById('cm-gokb');
  if(cmGokb)cmGokb.addEventListener('click',function(){
    document.querySelectorAll('.ks[data-kb-by]').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-kb-by')==='cat');});
    document.querySelectorAll('.kb-by[data-kb-by]').forEach(function(pn){pn.hidden=(pn.getAttribute('data-kb-by')!=='cat');});
  });
  var cmEdit=document.getElementById('cm-editcond');
  if(cmEdit)cmEdit.addEventListener('click',function(){
    var wm=document.getElementById('wk-modal');
    if(wm)wm.hidden=false;
  });
  document.querySelectorAll('[data-cm-close]').forEach(function(b){
    b.addEventListener('click',function(){cmModal.hidden=true;});
  });
  if(cmModal)cmModal.addEventListener('click',function(e){if(e.target===cmModal)cmModal.hidden=true;});

  // 관심 자료 추가 모달 (저장 + 온디맨드 겸용)
  var amModal=document.getElementById('am-modal');
  document.querySelectorAll('[data-am-open]').forEach(function(b){
    b.addEventListener('click',function(){if(amModal)amModal.hidden=false;});
  });
  document.querySelectorAll('[data-am-close]').forEach(function(b){
    b.addEventListener('click',function(){if(amModal)amModal.hidden=true;});
  });
  if(amModal)amModal.addEventListener('click',function(e){if(e.target===amModal)amModal.hidden=true;});
  document.querySelectorAll('.amopt[data-amopt]').forEach(function(o){
    o.addEventListener('click',function(){
      document.querySelectorAll('.amopt[data-amopt]').forEach(function(x){x.classList.toggle('on',x===o);});
    });
  });

  // 보관함: 검색·정렬·저장 해제 (타인 공개 보고서 북마크)
  (function(){
    var svQ='';
    var list=document.getElementById('sv-list');
    if(!list)return;
    function items(){return Array.prototype.slice.call(list.querySelectorAll('.sv-item'));}
    function apply(){
      var visible=0;
      items().forEach(function(it){
        if(it._removed){it.hidden=true;return;}
        var ok=!svQ||it.textContent.toLowerCase().indexOf(svQ.toLowerCase())>=0;
        it.hidden=!ok; if(ok)visible++;
      });
      document.getElementById('sv-empty').hidden=(visible!==0);
    }
    var q=document.getElementById('sv-q');
    if(q)q.addEventListener('input',function(){svQ=q.value.trim();apply();});
    var ea=document.getElementById('sv-empty-a');
    if(ea)ea.addEventListener('click',function(){svQ='';if(q)q.value='';apply();});
    document.querySelectorAll('[data-svsort]').forEach(function(b){
      b.addEventListener('click',function(){
        document.querySelectorAll('[data-svsort]').forEach(function(x){x.classList.toggle('on',x===b);});
        var k=(b.getAttribute('data-svsort')==='saved')?'data-saved':'data-pub';
        items().sort(function(x,y){return (+x.getAttribute(k))-(+y.getAttribute(k));}).forEach(function(it){list.appendChild(it);});
      });
    });
    document.querySelectorAll('[data-svint]').forEach(function(b){
      b.addEventListener('click',function(){
        svQ=b.getAttribute('data-svint');if(q)q.value=svQ;apply();
        window.scrollTo({top:0,behavior:'smooth'});
      });
    });
    var toast=document.getElementById('sv-toast'),lastRemoved=null,toastTimer=null;
    function hideToast(){toast.hidden=true;}
    document.getElementById('sv-undo').addEventListener('click',function(e){
      e.stopPropagation();
      if(lastRemoved){lastRemoved._removed=false;lastRemoved.classList.remove('removing');lastRemoved=null;apply();}
      clearTimeout(toastTimer);hideToast();
    });
    list.querySelectorAll('.sv-bm, .sv-rm').forEach(function(b){
      b.addEventListener('click',function(e){
        e.stopPropagation();
        var it=b.closest('.sv-item');
        it.classList.add('removing');
        setTimeout(function(){it._removed=true;apply();},200);
        lastRemoved=it;
        document.querySelectorAll('.svpop').forEach(function(pp){pp.hidden=true;});
        toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(hideToast,5000);
      });
    });
    list.querySelectorAll('.svmore').forEach(function(m){
      m.addEventListener('click',function(e){
        e.stopPropagation();
        var pop=m.querySelector('.svpop');var was=pop.hidden;
        document.querySelectorAll('.svpop').forEach(function(pp){pp.hidden=true;});
        pop.hidden=!was;
      });
    });
    list.querySelectorAll('.sv-noop').forEach(function(b){
      b.addEventListener('click',function(e){e.stopPropagation();});
    });
    document.addEventListener('click',function(){document.querySelectorAll('.svpop').forEach(function(pp){pp.hidden=true;});});
  })();

  // 타인 프로필: 팔로우 토글 / 공유 토스트 / 보관 연동
  (function(){
    var fbtn=document.getElementById('up-follow');
    if(!fbtn)return;
    var fcnt=document.getElementById('up-fcnt'),following=false,base=1284;
    function fmt(n){return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');}
    fbtn.addEventListener('click',function(){
      following=!following;
      fbtn.textContent=following?'팔로잉':'팔로우';
      fbtn.classList.toggle('signal',!following);
      fbtn.classList.toggle('following',following);
      fbtn.title=following?'클릭하면 팔로우를 해제해요':'';
      if(fcnt)fcnt.textContent=fmt(base+(following?1:0));
      var bell=document.getElementById('up-bell');
      if(bell){bell.hidden=!following;if(!following){bell.classList.remove('on');}}
    });
    var bellBtn=document.getElementById('up-bell');
    if(bellBtn)bellBtn.addEventListener('click',function(){
      var on=bellBtn.classList.toggle('on');
      bellBtn.title=on?'브리핑 알림 끄기':'브리핑 알림 받기';
      showToast(on?'FX Daily님의 브리핑 알림을 켰어요.':'브리핑 알림을 껐어요.');
    });
    var toast=document.getElementById('up-toast'),tt=document.getElementById('up-toast-t'),timer=null;
    function showToast(msg){
      tt.textContent=msg;toast.hidden=false;
      clearTimeout(timer);timer=setTimeout(function(){toast.hidden=true;},3000);
    }
    ['up-share','up-share2','up-copy'].forEach(function(id){
      var b=document.getElementById(id);
      if(b)b.addEventListener('click',function(e){e.stopPropagation();showToast('프로필 링크를 복사했어요.');document.querySelectorAll('.svpop').forEach(function(pp){pp.hidden=true;});});
    });
    var more=document.getElementById('up-more');
    if(more)more.addEventListener('click',function(e){
      e.stopPropagation();
      var pop=more.querySelector('.svpop');var was=pop.hidden;
      document.querySelectorAll('.svpop').forEach(function(pp){pp.hidden=true;});
      pop.hidden=!was;
    });
    // ⚑ 보관 → 내 보관함(sv-fx)과 실제 연동 (첫 카드)
    var fx=document.getElementById('sv-fx');
    if(fx)fx._removed=true;
    var first=true;
    document.querySelectorAll('#screen-uprofile .up-save').forEach(function(b){
      var linked=first;first=false;
      b.addEventListener('click',function(){
        var saved=b.classList.toggle('saved');
        b.innerHTML=saved?'⚑ <b>보관됨</b>':'⚑ 보관';
        showToast(saved?'보관함에 저장했어요.':'보관함에서 제거했어요.');
        if(linked&&fx){fx._removed=!saved;fx.hidden=!saved;}
      });
    });
  })();

  // 가입 유도 모달 (게스트)
  var gm=document.getElementById('guest-modal');
  var gmDemo=document.getElementById('guest-demo');
  if(gmDemo&&gm)gmDemo.addEventListener('click',function(){gm.hidden=false;});
  // guest variant 전용 (2026-07-21, CLAUDE.md §15): 인증 필요 액션(data-guest-gate)은
  // 실행 없이 가입 유도 모달만 연다. 열릴 때 주 CTA(data-gm-focus)에 포커스.
  // Final 목업에는 data-guest-gate 요소가 없어 동작 변화 없음.
  if(gm)document.querySelectorAll('[data-guest-gate]').forEach(function(b){
    b.addEventListener('click',function(e){
      e.stopPropagation();gm.hidden=false;
      var f=gm.querySelector('[data-gm-focus]');if(f)f.focus();
    });
  });
  // Esc 닫기 — 모달이 열려 있을 때만 동작. Final 목업은 #guest-modal을 여는 트리거가 없어 영향 없음.
  if(gm)document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&!gm.hidden)gm.hidden=true;
  });
  document.querySelectorAll('[data-gm-close]').forEach(function(b){
    b.addEventListener('click',function(){if(gm)gm.hidden=true;});
  });
  if(gm)gm.addEventListener('click',function(e){if(e.target===gm)gm.hidden=true;});

  // 추천 선호도 표시 (관심없음/마음에 들어요) — 시안
  (function(){
    var more=document.getElementById('rec-more');
    if(!more)return;
    var toast=document.getElementById('g-toast'),tt=document.getElementById('g-toast-t');
    function note(msg){
      tt.textContent=msg;toast.hidden=false;
      setTimeout(function(){toast.hidden=true;},3000);
    }
    more.addEventListener('click',function(e){
      e.stopPropagation();
      var pop=more.querySelector('.svpop');var was=pop.hidden;
      document.querySelectorAll('.svpop').forEach(function(pp){pp.hidden=true;});
      pop.hidden=!was;
    });
    document.getElementById('rec-like').addEventListener('click',function(e){
      e.stopPropagation();more.querySelector('.svpop').hidden=true;
      note('좋아요! 비슷한 추천을 더 보여드릴게요.');
    });
    document.getElementById('rec-hide').addEventListener('click',function(e){
      e.stopPropagation();more.querySelector('.svpop').hidden=true;
      var card=more.closest('.post');
      card.style.transition='opacity .25s';card.style.opacity='0';
      setTimeout(function(){card.style.display='none';},250);
      note('알려주셔서 감사해요. 이런 추천을 줄일게요.');
    });
  })();

  // 팔로워/팔로잉 목록 모달
  var ffm=document.getElementById('ff-modal');
  function showFF(t){
    document.querySelectorAll('[data-fftab]').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-fftab')===t);});
    document.querySelectorAll('[data-ffpane]').forEach(function(pn){pn.hidden=(pn.getAttribute('data-ffpane')!==t);});
  }
  document.querySelectorAll('[data-ff-open]').forEach(function(b){
    b.addEventListener('click',function(){showFF(b.getAttribute('data-ff-open'));if(ffm)ffm.hidden=false;});
  });
  document.querySelectorAll('[data-fftab]').forEach(function(b){
    b.addEventListener('click',function(){showFF(b.getAttribute('data-fftab'));});
  });
  document.querySelectorAll('[data-ff-close]').forEach(function(b){
    b.addEventListener('click',function(){ffm.hidden=true;});
  });
  if(ffm)ffm.addEventListener('click',function(e){if(e.target===ffm)ffm.hidden=true;});

  // 검색 결과: 탭 필터 (전체/보고서/사용자)
  document.querySelectorAll('[data-stab]').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('[data-stab]').forEach(function(x){x.classList.toggle('on',x===b);});
      var t=b.getAttribute('data-stab');
      document.querySelectorAll('[data-sgroup]').forEach(function(g){
        var grp=g.getAttribute('data-sgroup');
        g.style.display=((t==='all')||(grp===t))?'':'none';
      });
    });
  });

  // feed tabs (추천/팔로잉)
  document.querySelectorAll('[data-tab]').forEach(function(b){
    b.addEventListener('click',function(){
      var t=b.getAttribute('data-tab');
      document.querySelectorAll('[data-tab]').forEach(function(x){x.classList.toggle('on',x===b);});
      document.querySelectorAll('[data-feed]').forEach(function(f){f.hidden=(f.getAttribute('data-feed')!==t);});
    });
  });

  // profile tabs (브리핑/보관함/미디어/지식창고)
  document.querySelectorAll('[data-ptab]').forEach(function(b){
    b.addEventListener('click',function(){
      var t=b.getAttribute('data-ptab');
      document.querySelectorAll('[data-ptab]').forEach(function(x){x.classList.toggle('on',x===b);});
      document.querySelectorAll('[data-ppane]').forEach(function(p){p.hidden=(p.getAttribute('data-ppane')!==t);});
    });
  });

  // 테마 전환 컨트롤(목업 toolbar) 제거 — 페이지 기본 Light, 다크 토큰은 tokens.css에 유지.
  // 단, 설정 화면 내부의 테마 선택(실제 서비스 UI, [data-theme-btn])은 화면 내 상호작용으로 유지.
  (function(){
    var btns=document.querySelectorAll('[data-theme-btn]');
    if(!btns.length)return;
    var mq=window.matchMedia('(prefers-color-scheme: dark)');
    function applyTheme(mode){
      page.setAttribute('data-theme',(mode==='system')?(mq.matches?'dark':'light'):mode);
      btns.forEach(function(x){x.classList.toggle('on',x.getAttribute('data-theme-btn')===mode);});
    }
    btns.forEach(function(b){b.addEventListener('click',function(){applyTheme(b.getAttribute('data-theme-btn'));});});
    mq.addEventListener('change',function(){
      var cur=document.querySelector('[data-theme-btn].on');
      if(cur&&cur.getAttribute('data-theme-btn')==='system')applyTheme('system');
    });
  })();
})();

// 프로필 편집 모달
(function(){
  var pe=document.getElementById('pe-modal');
  if(!pe)return;
  var open=document.getElementById('pe-open');
  var name=document.getElementById('pe-name'),bio=document.getElementById('pe-bio'),n=document.getElementById('pe-bio-n');
  function sync(){if(n&&bio)n.textContent=bio.value.length;}
  sync();
  if(open)open.addEventListener('click',function(){pe.hidden=false;sync();});
  document.querySelectorAll('[data-pe-close]').forEach(function(b){b.addEventListener('click',function(){pe.hidden=true;});});
  pe.addEventListener('click',function(e){if(e.target===pe)pe.hidden=true;});
  if(bio)bio.addEventListener('input',sync);
  var save=document.getElementById('pe-save');
  if(save)save.addEventListener('click',function(){
    var nm=document.querySelector('#screen-profile .pname-lg');
    var bo=document.querySelector('#screen-profile .pbio');
    var hd=document.querySelector('#screen-profile .phandle');
    var handle=document.getElementById('pe-handle');
    if(nm&&name&&name.value.trim())nm.textContent=name.value.trim();
    if(bo&&bio&&bio.value.trim())bo.textContent=bio.value.trim();
    if(hd&&handle&&handle.value.trim())hd.textContent=handle.value.trim()+' \u00b7 \uac00\uc785 2026\ub144 3\uc6d4';
    pe.hidden=true;
    var toast=document.getElementById('g-toast'),tt=document.getElementById('g-toast-t');
    if(toast&&tt){tt.textContent='\ud504\ub85c\ud544\uc774 \uc218\uc815\ub418\uc5c8\uc2b5\ub2c8\ub2e4.';toast.hidden=false;setTimeout(function(){toast.hidden=true;},3000);}
  });
})();

// 설정 인터랙션 + Wiki 발견 관심사 (배치)
(function(){
  var toast=document.getElementById('g-toast'),tt=document.getElementById('g-toast-t');
  function note(msg){if(!toast||!tt)return;tt.textContent=msg;toast.hidden=false;setTimeout(function(){toast.hidden=true;},3000);}
  function wire(modalId,openId,closeAttr){
    var m=document.getElementById(modalId);if(!m)return null;
    var o=document.getElementById(openId);
    if(o)o.addEventListener('click',function(){m.hidden=false;});
    document.querySelectorAll('['+closeAttr+']').forEach(function(b){b.addEventListener('click',function(){m.hidden=true;});});
    m.addEventListener('click',function(e){if(e.target===m)m.hidden=true;});
    return m;
  }

  // 1) 발행 시간 드롭다운
  var ptChip=document.getElementById('pt-chip'),ptPop=document.getElementById('pt-pop');
  if(ptChip&&ptPop){
    ptChip.addEventListener('click',function(e){e.stopPropagation();ptPop.hidden=!ptPop.hidden;});
    document.addEventListener('click',function(){ptPop.hidden=true;});
    ptPop.querySelectorAll('[data-pt]').forEach(function(op){
      op.addEventListener('click',function(e){
        e.stopPropagation();ptChip.textContent=op.textContent;ptPop.hidden=true;
        note('\ubc1c\ud589 \uc2dc\uac04\uc744 '+op.textContent+'\uc73c\ub85c \ubcc0\uacbd\ud588\uc5b4\uc694. \ub0b4\uc77c \uc544\uce68\ubd80\ud130 \uc801\uc6a9\ub3fc\uc694.');
      });
    });
  }

  // 2) 이메일 변경
  var em=wire('em-modal','em-open','data-em-close');
  var emIn=document.getElementById('em-input'),emSend=document.getElementById('em-send');
  if(emIn&&emSend){
    emIn.addEventListener('input',function(){emSend.classList.toggle('dis',!(emIn.value.indexOf('@')>0&&emIn.value.indexOf('.')>0));});
    emSend.addEventListener('click',function(){
      em.hidden=true;
      note(emIn.value+' \uc8fc\uc18c\ub85c \ud655\uc778 \uba54\uc77c\uc744 \ubcf4\ub0c8\uc5b4\uc694. \ub9c1\ud06c\ub97c \ub204\ub974\uba74 \ubcc0\uacbd\uc774 \uc644\ub8cc\ub3fc\uc694.');
      emIn.value='';emSend.classList.add('dis');
    });
  }

  // 3) 비밀번호 변경
  var pw=wire('pw-modal','pw-open','data-pw-close');
  var p1=document.getElementById('pw-cur'),p2=document.getElementById('pw-new'),p3=document.getElementById('pw-new2'),pwSave=document.getElementById('pw-save');
  function pwCheck(){if(pwSave)pwSave.classList.toggle('dis',!(p1.value&&p2.value.length>=8&&p2.value===p3.value));}
  [p1,p2,p3].forEach(function(x){if(x)x.addEventListener('input',pwCheck);});
  if(pwSave)pwSave.addEventListener('click',function(){
    pw.hidden=true;
    var meta=document.getElementById('pw-meta');if(meta)meta.textContent='\ub9c8\uc9c0\ub9c9 \ubcc0\uacbd \u00b7 2026\ub144 7\uc6d4';
    note('\ube44\ubc00\ubc88\ud638\uac00 \ubcc0\uacbd\ub418\uc5c8\uc2b5\ub2c8\ub2e4.');
    p1.value=p2.value=p3.value='';pwCheck();
  });

  // 4) 회원 탈퇴
  var dm=wire('del-modal','del-open','data-del-close');
  var dIn=document.getElementById('del-input'),dGo=document.getElementById('del-go');
  if(dIn&&dGo){
    dIn.addEventListener('input',function(){dGo.classList.toggle('dis',dIn.value.trim().toLowerCase()!=='alphaparami@gmail.com');});
    dGo.addEventListener('click',function(){
      dm.hidden=true;
      note('\ud0c8\ud1f4\uac00 \uc644\ub8cc\ub418\uc5c8\uc5b4\uc694. \uadf8\ub3d9\uc548 \uac10\uc0ac\ud588\uc5b4\uc694. (\ubaa9\uc5c5 \uc2dc\uc5f0)');
      dIn.value='';dGo.classList.add('dis');
    });
  }

  // 5) Wiki: AI 발견 관심사 추가/무시
  var fdList=document.getElementById('fd-list');
  if(fdList){
    var mysc=document.getElementById('wk-mysc'),mysec=document.getElementById('wk-mysec');
    var total=6,active=5;
    function fdEmpty(){
      if(fdList.querySelectorAll('.frow2').length)return;
      fdList.innerHTML='<div class="frow2" style="justify-content:center;color:var(--ink-dim);font-size:12.5px;">\uc9c0\uae08\uc740 \uc0c8\ub85c \ubc1c\uacac\ud55c \uad00\uc2ec\uc0ac\uac00 \uc5c6\uc5b4\uc694.</div>';
    }
    function fade(row,done){row.style.transition='opacity .25s';row.style.opacity='0';setTimeout(function(){row.remove();done&&done();fdEmpty();},250);}
    fdList.querySelectorAll('.frow2').forEach(function(row){
      var name=row.querySelector('.fn2').textContent;
      var btns=row.querySelectorAll('.fa2 .btn');
      if(btns.length<2)return;
      btns[0].addEventListener('click',function(){
        fade(row,function(){
          total++;active++;
          if(mysc)mysc.textContent=total+'\uac1c \u00b7 \ud65c\uc131 '+active;
          if(mysec){
            var card=document.createElement('div');card.className='wcard';
            card.innerHTML='<div class="wc-top"><span class="wc-name"></span><span class="wsrc llm">\u25c8 LLM \ucd94\ub860</span><span class="conf">\ubc29\uae08 \ucd94\uac00\ub428</span><span class="sp"></span><span class="btn sm">\uc218\uc815\ud558\uae30</span></div><div class="wc-lbl">\ub2e4\uc74c \ube0c\ub9ac\ud551\ubd80\ud130 \ubc18\uc601\ub3fc\uc694 \u2014 AI\uac00 \uadfc\uac70\ub97c \uc313\uc544\uac00\uba70 \uc774\ud574\ub97c \uc815\ub9ac\ud574\uc694.</div>';
            card.querySelector('.wc-name').textContent=name;
            var wm=document.getElementById('wk-modal');
            card.querySelector('.btn').addEventListener('click',function(){if(wm)wm.hidden=false;});
            mysec.parentNode.insertBefore(card,mysec.nextElementSibling);
          }
          note('\u2018'+name+'\u2019\ub97c \uad00\uc2ec\uc0ac\uc5d0 \ucd94\uac00\ud588\uc5b4\uc694. \ub2e4\uc74c \ube0c\ub9ac\ud551\ubd80\ud130 \ubc18\uc601\ub3fc\uc694.');
        });
      });
      btns[1].addEventListener('click',function(){
        fade(row);
        note('\uc54c\uaca0\uc5b4\uc694. \uc774 \uc8fc\uc81c\ub294 \ub2f9\ubd84\uac04 \uc81c\uc548\ud558\uc9c0 \uc54a\uc744\uac8c\uc694.');
      });
    });
  }
})();

// 콘텐츠 상세 액션 바 (MD 복사 / 보관 토글 / 공유)
(function(){
  var toast=document.getElementById('g-toast'),tt=document.getElementById('g-toast-t');
  function note(msg){if(!toast||!tt)return;tt.textContent=msg;toast.hidden=false;setTimeout(function(){toast.hidden=true;},3000);}
  var md=document.getElementById('d-md');
  if(md)md.addEventListener('click',function(){
    var t=md.innerHTML;md.innerHTML='\u2713 \ubcf5\uc0ac\ub428';
    setTimeout(function(){md.innerHTML=t;},1600);
    note('\ubcf8\ubb38 \ub9c8\ud06c\ub2e4\uc6b4\uc744 \ubcf5\uc0ac\ud588\uc5b4\uc694. \uba54\ubaa8 \uc571\uc774\ub098 \ubb38\uc11c\uc5d0 \ubd99\uc5ec\ub123\uc73c\uba74 \ub3fc\uc694.');
  });
  var sv=document.getElementById('d-save');
  if(sv)sv.addEventListener('click',function(){
    var on=sv.getAttribute('data-on')==='1';
    sv.setAttribute('data-on',on?'0':'1');
    sv.textContent=on?'\u2691 \ubcf4\uad00':'\u2691 \ubcf4\uad00\ub428';
    note(on?'\ubcf4\uad00\ud568\uc5d0\uc11c \uc81c\uac70\ud588\uc5b4\uc694.':'\ubcf4\uad00\ud568\uc5d0 \uc800\uc7a5\ud588\uc5b4\uc694.');
  });
  var sh=document.getElementById('d-share'),shm=document.getElementById('sh-modal');
  if(sh&&shm){
    sh.addEventListener('click',function(){shm.hidden=false;});
    document.querySelectorAll('[data-sh-close]').forEach(function(b){b.addEventListener('click',function(){shm.hidden=true;});});
    shm.addEventListener('click',function(e){if(e.target===shm)shm.hidden=true;});
    var lk=document.getElementById('sh-link');
    if(lk)lk.addEventListener('click',function(){shm.hidden=true;note('\ube0c\ub9ac\ud551 \ub9c1\ud06c\ub97c \ubcf5\uc0ac\ud588\uc5b4\uc694. \uacf5\uac1c \uc804\uae4c\uc9c0\ub294 \ub098\ub9cc \uc5f4 \uc218 \uc788\uc5b4\uc694.');});
    var po=document.getElementById('sh-post');
    if(po)po.addEventListener('click',function(){
      shm.hidden=true;
      var pill=document.getElementById('d-pill');
      if(pill){pill.textContent='\uacf5\uac1c';pill.style.color='var(--ok-ink, var(--ink))';}
      note('\uacf5\uac1c\ub85c \uc804\ud658\ud558\uace0 \ud53c\ub4dc\uc5d0 \uac8c\uc2dc\ud588\uc5b4\uc694.');
      setTimeout(function(){var h=document.querySelector('.seg [data-screen="home"]');if(h)h.click();var ft=document.querySelector('#screen-home [data-tab="rec"]');if(ft)ft.click();},900);
    });
  }
})();
