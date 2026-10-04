/**
 * ============================================================================
 * 錦葳健康美學中心 - 後台店務系統 (app.js)
 * V3.1 防白畫面降級版：全面 Try-Catch 包覆與 Boolean 嚴格檢驗
 * ============================================================================
 */

if (typeof API === 'undefined') {
    window.API = 'YOUR_GAS_WEB_APP_URL_HERE'; 
}

function el(id) { return document.getElementById(id); }
function v(id) { return el(id) ? el(id).value : ''; }

// 🌟 指定系統權限代號為 store (後台店務系統)
const SYSTEM_AUTH_TYPE = "store"; 

// 🌟 V3.1 極致防呆：無論傳入什麼，只認 true 布林值
const isAllowed = (val) => val === true || val === "允許" || String(val).toLowerCase() === "true";

async function initSystemAuth() {
  try {
      const urlParams = new URLSearchParams(window.location.search);
      const isSso = urlParams.get('sso_auth') === 'true';

      // 若無 SSO 參數 (外部直連)，100% 降級彈出密碼鎖
      if (!isSso) {
          promptExternalPinLogin();
          return;
      }

      // 🌟 LIFF 初始化加入 Promise.race 防呆，避免永久掛起
      const liffInitPromise = liff.init({ liffId: window.LIFF_ID || "YOUR_LIFF_ID_HERE" });
      const liffTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('LIFF_TIMEOUT')), 5000));
      
      await Promise.race([liffInitPromise, liffTimeout]);
      
      if (!liff.isLoggedIn()) {
          liff.login();
      } else {
          const profile = await liff.getProfile();
          window.userLineUid = profile.userId;
          ssoFastLogin(window.userLineUid);
      }
  } catch (err) {
      console.warn("啟動異常，降級為密碼模式防護", err);
      promptExternalPinLogin();
  }
}

async function ssoFastLogin(uid) {
  try {
      const res = await fetch(API, {
          method: 'POST',
          body: JSON.stringify({ action: "ssoFastCheck", lineUid: uid })
      });
      const data = await res.json();
      
      if (data.status === "success") {
          checkSystemPermissionAndRender(data.staff);
      } else {
          Swal.fire('驗證失效', data.message, 'error').then(promptExternalPinLogin);
      }
  } catch (err) {
      console.warn("SSO 驗證網路異常", err);
      Swal.fire('連線錯誤', '網路異常，無法進行免密核對。', 'error').then(promptExternalPinLogin);
  }
}

function promptExternalPinLogin() {
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
  // 🌟 V3.1 使用嚴格 Boolean 檢驗
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
    localStorage.setItem('Staff_Name', staffData.Staff_Name);
    localStorage.setItem('Auth_Store', isAllowed(staffData.Auth_Store));
    localStorage.setItem('Auth_Finance', isAllowed(staffData.Auth_Finance));

    if(el('fCash')) el('fCash').value = staffData.Staff_Name;
    if(el('staffBadge')) el('staffBadge').innerText = `操作員：${staffData.Staff_Name}`;

    // 依據財務權限決定是否鎖定對應頁籤
    if (!isAllowed(staffData.Auth_Finance)) {
        if(el('btnTabFinance')) el('btnTabFinance').classList.add('ui-guard-locked');
        if(el('btnTabAdjust')) el('btnTabAdjust').classList.add('ui-guard-locked');
        if(el('btnTabPoints')) el('btnTabPoints').classList.add('ui-guard-locked');
    } else {
        if(el('btnTabFinance')) el('btnTabFinance').classList.remove('ui-guard-locked');
        if(el('btnTabAdjust')) el('btnTabAdjust').classList.remove('ui-guard-locked');
        if(el('btnTabPoints')) el('btnTabPoints').classList.remove('ui-guard-locked');
    }

    // ✅ 驗證與權限派發完成，安全解鎖 UI 並隱藏載入遮罩
    const loadingOverlay = el('loadingOverlay');
    if(loadingOverlay) loadingOverlay.style.display = 'none';

    const appContainer = el('mainAppContainer');
    if(appContainer) {
        appContainer.style.display = 'block';
    }
    
    const defaultTabBtn = document.getElementById('btnTabBooking');
    if (defaultTabBtn) {
        window.switchTab('bookingTab', defaultTabBtn);
    }
}

window.addEventListener("DOMContentLoaded", initSystemAuth);

// 共用工具庫維持原樣
window.switchTab = function(tabId, btn) {
    document.querySelectorAll('.form-section').forEach(el => { el.classList.remove('active'); el.style.display = 'none'; });
    document.querySelectorAll('.tab-btn').forEach(el => { el.classList.remove('active'); });
    const target = document.getElementById(tabId);
    if (target) { target.classList.add('active'); target.style.display = 'block'; }
    if (btn) btn.classList.add('active');
};

window.apiCall = async function(action, payload, successMsg) {
    const staffName = localStorage.getItem('Staff_Name') || '未授權操作員';
    const finalPayload = { action: action, operator: staffName, ...payload };
    const fetchPromise = fetch(API, { method: 'POST', body: JSON.stringify(finalPayload) });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000));
    try {
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        const r = await response.json();
        if (r.status === 'success') { if (successMsg) Swal.fire('成功', successMsg, 'success'); return r; } 
        else { Swal.fire('操作失敗', r.message, 'warning'); return null; }
    } catch(e) {
        if (e.message === 'TIMEOUT') { Swal.fire('連線逾時', '系統連線逾時 (Timeout 5s)！', 'error'); } 
        else { Swal.fire('網路異常', '系統網路異常，請稍後再試。', 'error'); }
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
