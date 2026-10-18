/**
 * ============================================================================
 * 錦葳健康美學中心 - 後台店務系統 (app.js)
 * V4.3 終極極簡化：UID 白名單極速通行版 (徹底解耦遠端驗證)
 * ============================================================================
 */

if (typeof API === 'undefined') {
    window.API = 'https://script.google.com/macros/s/AKfycbwvFhB4fX_h3W2BdHadQOXo1VJzUaEzmiO93kxoNlaOLBwJz0tblFWPABB9q18aDIS4/exec'; // ⚠️ 請確保中央發布的網址結尾包含 /exec
}

function el(id) { return document.getElementById(id); }
function v(id) { return el(id) ? el(id).value : ''; }

const SYSTEM_AUTH_TYPE = "store"; 
const isAllowed = (val) => val === true || val === "允許" || String(val).toLowerCase() === "true";

// 🌟 全域變數：操作員實名綁定
window.currentOperator = '未登入';

// 🌟 V4.3 本地 UID 授權白名單
const AUTHORIZED_USERS = { 
    "Udb1efc9c39494178114788d794028649": "陳奎元", 
    "U11376dff05337ec6ff7042b204cbff58": "千芳" 
};

async function initSystemAuth() {
  try {
      const liffInitPromise = liff.init({ liffId: window.LIFF_ID || "YOUR_LIFF_ID_HERE" });
      const liffTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('LIFF_TIMEOUT')), 5000));
      
      await Promise.race([liffInitPromise, liffTimeout]);
      
      if (!liff.isLoggedIn()) {
          liff.login();
      } else {
          const profile = await liff.getProfile();
          window.userLineUid = profile.userId;
          verifyUidAndRender(window.userLineUid);
      }
  } catch (err) {
      console.warn("LIFF 啟動異常或超時", err);
      Swal.fire('系統錯誤', 'LINE 授權載入失敗，請檢查網路後重新整理。', 'error');
  } finally {
      // 🔴 強制拆除遮罩死鎖：無論 LIFF 狀態為何，絕對隱藏遮罩
      if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';
  }
}

// 🌟 V4.3 極速通行與阻擋邏輯
function verifyUidAndRender(uid) {
    const operatorName = AUTHORIZED_USERS[uid];
    
    if (operatorName) {
        // 驗證成功：放行並給予店務與財務權限，轉交主渲染引擎
        const staffData = {
            Staff_Name: operatorName,
            Auth_Store: true,
            Auth_Finance: true
        };
        renderBackendPlatform(staffData);
    } else {
        // 驗證失敗：徹底阻擋
        Swal.fire({
            title: '拒絕存取',
            text: '未經授權的操作人員',
            icon: 'error',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false
        });
    }
}

function renderBackendPlatform(staffData) {
    // 🌟 實名追蹤綁定與 UI 渲染
    window.currentOperator = staffData.Staff_Name || '未登入操作員';
    localStorage.setItem('Staff_Name', window.currentOperator);
    localStorage.setItem('Auth_Store', isAllowed(staffData.Auth_Store));
    localStorage.setItem('Auth_Finance', isAllowed(staffData.Auth_Finance));

    if(el('fCash')) el('fCash').value = window.currentOperator;
    if(el('staffBadge')) el('staffBadge').innerText = `目前操作員：${window.currentOperator}`;

    if (!isAllowed(staffData.Auth_Finance)) {
        if(el('btnTabFinance')) el('btnTabFinance').classList.add('ui-guard-locked');
        if(el('btnTabAdjust')) el('btnTabAdjust').classList.add('ui-guard-locked');
        if(el('btnTabPoints')) el('btnTabPoints').classList.add('ui-guard-locked');
    } else {
        if(el('btnTabFinance')) el('btnTabFinance').classList.remove('ui-guard-locked');
        if(el('btnTabAdjust')) el('btnTabAdjust').classList.remove('ui-guard-locked');
        if(el('btnTabPoints')) el('btnTabPoints').classList.remove('ui-guard-locked');
    }

    const appContainer = el('mainAppContainer');
    if(appContainer) appContainer.classList.remove('ui-guard-locked');
    
    // 雙重保險確保遮罩移除
    if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';

    const defaultTabBtn = document.getElementById('btnTabBooking');
    if (defaultTabBtn) {
        window.switchTab('bookingTab', defaultTabBtn);
    }
}

window.addEventListener("DOMContentLoaded", initSystemAuth);

// ==========================================
// 共用工具庫
// ==========================================
window.switchTab = function(tabId, btn) {
    document.querySelectorAll('.form-section').forEach(el => { el.classList.remove('active'); el.style.display = 'none'; });
    document.querySelectorAll('.tab-btn').forEach(el => { el.classList.remove('active'); });
    const target = document.getElementById(tabId);
    if (target) { target.classList.add('active'); target.style.display = 'block'; }
    if (btn) btn.classList.add('active');
};

window.apiCall = async function(action, payload, successMsg) {
    // 🌟 強制蓋章：所有的操作自動夾帶全域操作員名稱，落實實名追蹤
    const finalOperator = window.currentOperator !== '未登入' ? window.currentOperator : (localStorage.getItem('Staff_Name') || '系統');
    const finalPayload = { action: action, operator: finalOperator, ...payload };
    
    const fetchPromise = fetch(API, { method: 'POST', body: JSON.stringify(finalPayload) });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000));
    
    try {
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        const r = await response.json();
        if (r.status === 'success') { if (successMsg) Swal.fire('成功', successMsg, 'success'); return r; } 
        else { Swal.fire('操作失敗', r.message, 'warning'); return null; }
    } catch(e) {
        if (e.message === 'TIMEOUT') { Swal.fire('連線逾時', '⚠️ 系統連線逾時 (Timeout 5s)！\n請檢查網路連線後重試。', 'error'); } 
        else { Swal.fire('網路異常', '系統網路異常，請稍後再試。', 'error'); }
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
        const val = input.value.trim(); list.innerHTML = '';
        if (!val) { list.style.display = 'none'; return; }
        const filtered = window.membersData.filter(m => m.name.includes(val) || m.phone.includes(val)).slice(0, 5);
        if (filtered.length > 0) {
            filtered.forEach(m => {
                const item = document.createElement('div'); item.className = 'autocomplete-item'; item.innerText = `${m.name} (${m.phone})`;
                item.onclick = () => { input.value = m.name; if(phoneInputId && el(phoneInputId)) el(phoneInputId).value = m.phone; list.style.display = 'none'; };
                list.appendChild(item);
            });
            list.style.display = 'block';
        } else { list.style.display = 'none'; }
    }
};

document.addEventListener('click', function (e) {
    document.querySelectorAll('.autocomplete-list').forEach(list => {
        if (!list.contains(e.target) && e.target.tagName !== 'INPUT') { list.style.display = 'none'; }
    });
});
