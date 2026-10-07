/**
 * ============================================================================
 * 錦葳健康美學中心 - 後台店務系統 (app.js)
 * V4.0 極簡解耦版：廢除 SSO，全面回歸 LIFF + PIN 獨立驗證與實名追蹤
 * ============================================================================
 */

if (typeof API === 'undefined') {
    window.API = 'YOUR_GAS_WEB_APP_URL_HERE'; // ⚠️ 請確保中央發布的網址結尾包含 /exec
}

function el(id) { return document.getElementById(id); }
function v(id) { return el(id) ? el(id).value : ''; }

const SYSTEM_AUTH_TYPE = "store"; 
const isAllowed = (val) => val === true || val === "允許" || String(val).toLowerCase() === "true";

// 🌟 全域變數：操作員實名綁定
window.currentOperator = '未登入';

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
          
          // 隱藏遮罩並強制彈出密碼鎖
          if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';
          promptExternalPinLogin();
      }
  } catch (err) {
      console.warn("LIFF 啟動異常，降級為純密碼模式防護", err);
      if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';
      promptExternalPinLogin();
  }
}

function promptExternalPinLogin() {
  if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';

  Swal.fire({
    title: '錦葳系統 - 安全鎖',
    input: 'password',
    inputPlaceholder: '請輸入您的專屬密碼',
    allowOutsideClick: false,
    allowEscapeKey: false,
    confirmButtonText: '解鎖',
    confirmButtonColor: '#ea580c',
    showLoaderOnConfirm: true,
    preConfirm: async (pin) => {
      if(!pin) {
          Swal.showValidationMessage('請輸入密碼');
          return false;
      }
      try {
          const res = await fetch(API, {
              method: 'POST',
              body: JSON.stringify({ action: "staffLogin", lineUid: window.userLineUid || "", pin: pin })
          });
          return await res.json();
      } catch (err) {
          console.error("Login API 呼叫失敗", err);
          Swal.showValidationMessage('網路連線失敗，請檢查網路狀態');
          return false;
      }
    }
  }).then((result) => {
    if (result.isConfirmed && result.value && result.value.status === "success") {
      checkSystemPermissionAndRender(result.value.staff);
    } else if (result.isConfirmed) {
      Swal.fire('錯誤', result.value.message || '驗證失敗', 'error').then(promptExternalPinLogin);
    }
  });
}

function checkSystemPermissionAndRender(staff) {
  if (SYSTEM_AUTH_TYPE === "store" && !isAllowed(staff.Auth_Store)) {
    Swal.fire({
        title: '權限不足', 
        text: '您無權訪問後台店務系統，即將退回安全鎖。', 
        icon: 'error',
        allowOutsideClick: false
    }).then(promptExternalPinLogin);
    return;
  }
  renderBackendPlatform(staff); 
}

function renderBackendPlatform(staffData) {
    // 🌟 實名追蹤綁定與 UI 渲染
    window.currentOperator = staffData.name || staffData.Staff_Name || '未登入操作員';
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
        if (e.message === 'TIMEOUT') { Swal.fire('連線逾時', '⚠️ 系統連線逾時 (Timeout 5s)！\n已自動攔截卡死狀態，請檢查網路連線後重試。', 'error'); } 
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
