/**
 * 錦葳健康美學中心 - 全域共用工具與狀態管理器 (app.js)
 */

if (typeof API === 'undefined') {
    window.API = 'YOUR_GAS_WEB_APP_URL_HERE'; 
}

function el(id) { return document.getElementById(id); }
function v(id) { return el(id) ? el(id).value : ''; }

window.switchTab = function(tabId, btn) {
    document.querySelectorAll('.form-section').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none'; 
    });
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block'; 
    }
    if (btn) btn.classList.add('active');
};

// ==========================================
// 🌟 V2.5 API 呼叫共用封裝 (含 Timeout 防護與戳記夾帶)
// ==========================================
window.apiCall = async function(action, payload, successMsg) {
    const staffName = localStorage.getItem('Staff_Name') || '系統預設';
    const finalPayload = { action: action, operator: staffName, ...payload };

    const fetchPromise = fetch(API, {
        method: 'POST',
        body: JSON.stringify(finalPayload)
    });

    // 5秒 Timeout 攔截卡死 Bug
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 5000)
    );

    try {
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        const r = await response.json();
        if (r.status === 'success') {
            if (successMsg) alert(successMsg);
            return r;
        } else {
            alert('操作失敗：' + r.message);
            return null;
        }
    } catch(e) {
        if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';

        if (e.message === 'TIMEOUT') {
            alert('⚠️ 系統連線逾時 (Timeout 5s)！\n已自動攔截卡死狀態，請檢查網路連線後重試。');
        } else {
            alert('系統網路異常，請稍後再試。');
        }
        console.error(e);
        return null;
    }
};

window.getTimeOptionsHTML = function(selectedTime = '') {
    let html = '';
    for (let h = 9; h <= 22; h++) {
        for (let m of ['00', '30']) {
            let timeStr = `${String(h).padStart(2, '0')}:${m}`;
            let sel = (timeStr === selectedTime) ? 'selected' : '';
            html += `<option value="${timeStr}" ${sel}>${timeStr}</option>`;
        }
    }
    return html;
};

window.showAutocomplete = function(inputId, listId, phoneInputId) {
    const input = el(inputId); const list = el(listId);
    if (!input || !list) return;

    if (window.membersData && window.membersData.length > 0) {
        const val = input.value.trim();
        list.innerHTML = '';
        if (!val) { list.style.display = 'none'; return; }
        
        const filtered = window.membersData.filter(m => m.name.includes(val) || m.phone.includes(val)).slice(0, 5);
        if (filtered.length > 0) {
            filtered.forEach(m => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.innerText = `${m.name} (${m.phone})`;
                item.onclick = () => {
                    input.value = m.name;
                    if(phoneInputId && el(phoneInputId)) el(phoneInputId).value = m.phone;
                    list.style.display = 'none';
                };
                list.appendChild(item);
            });
            list.style.display = 'block';
        } else { list.style.display = 'none'; }
    }
};

document.addEventListener('click', function (e) {
    document.querySelectorAll('.autocomplete-list').forEach(list => {
        if (!list.contains(e.target) && e.target.tagName !== 'INPUT') {
            list.style.display = 'none';
        }
    });
});

// ==========================================
// 🌟 V2.5 UI Guard 權限動態渲染
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 讀取前台驗證後存入本地端的 Token
    const authFinance = localStorage.getItem('Auth_Finance') === 'true';

    // 若無財務權限，將財務與點數銀行三大頁籤無條件鎖死並隱藏
    if (!authFinance) {
        if(el('btnTabFinance')) el('btnTabFinance').classList.add('ui-guard-locked');
        if(el('btnTabAdjust')) el('btnTabAdjust').classList.add('ui-guard-locked');
        if(el('btnTabPoints')) el('btnTabPoints').classList.add('ui-guard-locked');
    }

    const defaultTabBtn = document.getElementById('btnTabBooking');
    if (defaultTabBtn) {
        window.switchTab('bookingTab', defaultTabBtn);
    }
    
    // 安全移除連線驗證遮罩
    setTimeout(() => {
        if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';
    }, 800);
});
