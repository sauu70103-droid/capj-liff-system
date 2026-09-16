/**
 * 錦葳健康美學中心 - 全域共用工具與狀態管理器 (app.js)
 */

// 確保連線至對應之後台 GAS 部署網址 (請於 config.js 設定 API 變數)
// 若 config.js 未掛載，給予預設空值防呆
if (typeof API === 'undefined') {
    window.API = 'YOUR_GAS_WEB_APP_URL_HERE'; 
}

// 簡易 DOM 選擇器
function el(id) { return document.getElementById(id); }
function v(id) { return el(id) ? el(id).value : ''; }

// ==========================================
// 🌟 UI 修復：絕對防呆的頁籤切換引擎
// ==========================================
window.switchTab = function(tabId, btn) {
    // 1. 移除所有區塊的 active，並加上雙重保險 display: none
    document.querySelectorAll('.form-section').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none'; 
    });
    
    // 2. 移除所有按鈕的 active
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    // 3. 啟動目標區塊，雙重保險 display: block，確保畫面撐開不留白
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block'; 
    }
    
    if (btn) {
        btn.classList.add('active');
    }
};

// 確保系統載入時，強制渲染第一個頁籤，避免空白
document.addEventListener('DOMContentLoaded', () => {
    const defaultTabBtn = document.getElementById('btnTabBooking');
    if (defaultTabBtn) {
        window.switchTab('bookingTab', defaultTabBtn);
    }
    
    // 關藏 Loading 動畫 (假設有權限驗證，驗證後關閉)
    setTimeout(() => {
        if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';
    }, 800);
});

// ==========================================
// API 呼叫共用封裝
// ==========================================
window.apiCall = async function(action, payload, successMsg) {
    try {
        const response = await fetch(API, {
            method: 'POST',
            body: JSON.stringify({ action: action, ...payload })
        });
        const r = await response.json();
        if (r.status === 'success') {
            if (successMsg) alert(successMsg);
            return r;
        } else {
            alert('操作失敗：' + r.message);
            return null;
        }
    } catch(e) {
        alert('系統網路異常，請稍後再試。');
        console.error(e);
        return null;
    }
};

// ==========================================
// 時間選單與自動完成輔助
// ==========================================
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

// 簡易 Autocomplete (實際資料由 fetchMembers 供給，此處保留介面不報錯)
window.showAutocomplete = function(inputId, listId, phoneInputId) {
    const input = el(inputId);
    const list = el(listId);
    if (!input || !list) return;

    // 若未來有掛載 members 全域變數則進行過濾
    if (window.membersData && window.membersData.length > 0) {
        const val = input.value.trim();
        list.innerHTML = '';
        if (!val) {
            list.style.display = 'none';
            return;
        }
        
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
        } else {
            list.style.display = 'none';
        }
    }
};

// 點擊外部關閉 autocomplete
document.addEventListener('click', function (e) {
    document.querySelectorAll('.autocomplete-list').forEach(list => {
        if (!list.contains(e.target) && e.target.tagName !== 'INPUT') {
            list.style.display = 'none';
        }
    });
});
