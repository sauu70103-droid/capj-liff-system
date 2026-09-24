/**
 * ============================================================================
 * 錦葳健康美學中心 - 後台店務系統 (app.js)
 * V3.5 權限升級版：SSO 雙軌登入驗證、UI Guard 防護與共用 API 路由
 * ============================================================================
 */

if (typeof API === 'undefined') {
    window.API = 'YOUR_GAS_WEB_APP_URL_HERE'; 
}

function el(id) { return document.getElementById(id); }
function v(id) { return el(id) ? el(id).value : ''; }

// ==========================================
// 🌟 V3.5：SSO 極速雙軌登入模組 (核心啟動器)
// ==========================================
function initSystemAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const isSso = urlParams.get('sso_auth') === 'true';

  // 取得 LINE_ID (支援 LIFF)
  liff.init({ liffId: window.LIFF_ID || "YOUR_LIFF_ID_HERE" }).then(() => {
    if (!liff.isLoggedIn()) {
      liff.login();
    } else {
      liff.getProfile().then(profile => {
        window.userLineUid = profile.userId;
        
        if (isSso) {
          // 🚀 SSO 免密背景極速核對通道
          ssoFastLogin(window.userLineUid);
        } else {
          // 🔒 外部直連密碼鎖通道
          promptExternalPinLogin();
        }
      });
    }
  }).catch((err) => {
      // 若 LIFF 初始化失敗 (例如在電腦瀏覽器測試)，降級為純密碼驗證
      console.warn("LIFF 載入失敗，降級為純密碼模式", err);
      promptExternalPinLogin();
  });
}

function ssoFastLogin(uid) {
  fetch(API, {
    method: 'POST',
    body: JSON.stringify({ action: "ssoFastCheck", lineUid: uid })
  }).then(res => res.json()).then(data => {
    if (data.status === "success") {
      // ✅ 瞬間放行：渲染後台並套用權限
      renderBackendPlatform(data.staff);
    } else {
      Swal.fire('驗證失效', data.message, 'error').then(promptExternalPinLogin);
    }
  }).catch(() => {
      Swal.fire('連線錯誤', '網路異常，無法進行免密核對。', 'error').then(promptExternalPinLogin);
  });
}

function promptExternalPinLogin() {
  Swal.fire({
    title: '錦葳店務系統 - 安全鎖',
    input: 'password',
    inputPlaceholder: '請輸入您的專屬密碼',
    allowOutsideClick: false,
    allowEscapeKey: false,
    confirmButtonText: '解鎖',
    confirmButtonColor: '#ea580c',
    showLoaderOnConfirm: true,
    preConfirm: (pin) => {
      if(!pin) {
          Swal.showValidationMessage('請輸入密碼');
          return false;
      }
      return fetch(API, {
        method: 'POST',
        body: JSON.stringify({ action: "staffLogin", lineUid: window.userLineUid || "", pin: pin })
      }).then(res => res.json()).catch(() => {
          Swal.showValidationMessage('網路連線失敗');
      });
    }
  }).then((result) => {
    if (result.isConfirmed && result.value.status === "success") {
      // ✅ 密碼解鎖放行
      renderBackendPlatform(result.value.staff);
    } else {
      Swal.fire('錯誤', result.value.message || '驗證失敗', 'error').then(promptExternalPinLogin);
    }
  });
}

// ==========================================
// 🌟 主渲染引擎與 UI Guard 對接
// ==========================================
function renderBackendPlatform(staffData) {
    // 1. 寫入本地端與戳記
    localStorage.setItem('Staff_Name', staffData.Staff_Name);
    localStorage.setItem('Auth_Shop', staffData.Auth_Shop);
    localStorage.setItem('Auth_Finance', staffData.Auth_Finance);

    if(el('fCash')) el('fCash').value = staffData.Staff_Name;
    if(el('staffBadge')) el('staffBadge').innerText = `操作員：${staffData.Staff_Name}`;

    // 2. UI Guard 財務權限防護 (若無權限，鎖死並隱藏三大頁籤)
    if (!staffData.Auth_Finance) {
        if(el('btnTabFinance')) el('btnTabFinance').classList.add('ui-guard-locked');
        if(el('btnTabAdjust')) el('btnTabAdjust').classList.add('ui-guard-locked');
        if(el('btnTabPoints')) el('btnTabPoints').classList.add('ui-guard-locked');
    } else {
        // 確保解鎖狀態
        if(el('btnTabFinance')) el('btnTabFinance').classList.remove('ui-guard-locked');
        if(el('btnTabAdjust')) el('btnTabAdjust').classList.remove('ui-guard-locked');
        if(el('btnTabPoints')) el('btnTabPoints').classList.remove('ui-guard-locked');
    }

    // 3. 解除靜默：顯示主容器，並強制切換到第一個頁籤
    const appContainer = el('mainAppContainer');
    if(appContainer) appContainer.classList.remove('ui-guard-locked');
    
    const defaultTabBtn = document.getElementById('btnTabBooking');
    if (defaultTabBtn) {
        window.switchTab('bookingTab', defaultTabBtn);
    }
}

// 系統載入時，直接啟動登入驗證程序
window.addEventListener("DOMContentLoaded", initSystemAuth);


// ==========================================
// 共用工具庫
// ==========================================
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

window.apiCall = async function(action, payload, successMsg) {
    const staffName = localStorage.getItem('Staff_Name') || '未授權操作員';
    const finalPayload = { action: action, operator: staffName, ...payload };

    const fetchPromise = fetch(API, {
        method: 'POST',
        body: JSON.stringify(finalPayload)
    });

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 5000)
    );

    try {
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        const r = await response.json();
        if (r.status === 'success') {
            if (successMsg) Swal.fire('成功', successMsg, 'success');
            return r;
        } else {
            Swal.fire('操作失敗', r.message, 'warning');
            return null;
        }
    } catch(e) {
        if (e.message === 'TIMEOUT') {
            Swal.fire('連線逾時', '⚠️ 系統連線逾時 (Timeout 5s)！\n已自動攔截卡死狀態，請檢查網路連線後重試。', 'error');
        } else {
            Swal.fire('網路異常', '系統網路異常，請稍後再試。', 'error');
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
