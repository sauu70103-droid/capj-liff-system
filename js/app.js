// ==========================================
// 系統初始化與介面控制
// ==========================================
liff.init({ liffId: '2010453415-nTX3Lo1L' }).then(async () => {
    if (!liff.isLoggedIn()) {
        liff.login();
    } else {
        try {
            const profile = await liff.getProfile();
            el('fCash').value = profile.displayName;
            
            const response = await fetch(API, {
                method: 'POST', 
                body: JSON.stringify({ action: 'checkAuth', userName: profile.displayName })
            });
            const r = await response.json();
            el('loadingOverlay').style.display = 'none';
            
            if (r.status === 'success') {
                if (r.permissions.canAccessFinance) {
                    el('btnTabFinance').classList.remove('hidden');
                    el('btnTabAdjust').classList.remove('hidden');
                }
                if (r.permissions.canViewSummary) {
                    el('summaryDashboard').classList.remove('hidden');
                }
                fetchCRMData();
            }
        } catch(e) {
            el('loadingOverlay').innerText = '驗證連線失敗，請洽詢管理員。';
        }
    }
});

async function fetchCRMData() {
    try {
        const res = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'fetchMembers' }) }).then(x => x.json());
        if (res.status === 'success') memberDatabase = res.data;
    } catch(e) { console.log("CRM 載入失敗", e); }
}

function showAutocomplete(inputId, dropdownId, phoneInputId) {
    const inputVal = el(inputId).value.trim();
    const drop = el(dropdownId);
    drop.innerHTML = '';
    if (!inputVal) { drop.style.display = 'none'; return; }
    const matches = memberDatabase.filter(m => m.name.includes(inputVal) || (m.phone && m.phone.includes(inputVal)));
    if (matches.length === 0) { drop.style.display = 'none'; return; }
    matches.forEach(m => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.innerText = `${m.name} (${m.phone || '無手機'})`;
        div.onclick = () => {
            el(inputId).value = m.name;
            if (phoneInputId && m.phone) el(phoneInputId).value = m.phone;
            drop.style.display = 'none';
        };
        drop.appendChild(div);
    });
    drop.style.display = 'block';
}

document.addEventListener('click', function(e) {
    const dropdowns = document.querySelectorAll('.autocomplete-list');
    dropdowns.forEach(drop => { if (!e.target.closest('.autocomplete-container')) drop.style.display = 'none'; });
});

function switchTab(id, btn) {
    document.querySelectorAll('.form-section').forEach(x => { x.style.display = 'none'; });
    document.querySelectorAll('.tab-btn').forEach(x => { x.classList.remove('active'); });
    el(id).style.display = 'block';
    btn.classList.add('active');
    
    if (id === 'adjustTab') {
        loadRecentFinanceRecords();
    } else if (id === 'financeTab') {
        const nowObj = new Date();
        const tzOffset = nowObj.getTimezoneOffset() * 60000;
        const localISO = (new Date(nowObj - tzOffset)).toISOString().slice(0, 16);
        const [d, t] = localISO.split('T');
        if(el('fDate')) el('fDate').value = d;
        if(el('fTime')) el('fTime').value = t;
    }
}
