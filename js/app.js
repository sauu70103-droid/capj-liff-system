/**
 * ============================================================================
 * 錦葳健康美學中心 - 後台店務系統 (app.js)
 * V4.5 動態雲端授權版：直接讀取 Google Sheet 權限，雙重防卡死機制
 * ============================================================================
 */

if (typeof API === 'undefined') {
    window.API = 'https://script.google.com/macros/s/AKfycbwvFhB4fX_h3W2BdHadQOXo1VJzUaEzmiO93kxoNlaOLBwJz0tblFWPABB9q18aDIS4/exec'; 
}

function el(id) { return document.getElementById(id); }
function v(id) { return el(id) ? el(id).value : ''; }

const SYSTEM_AUTH_TYPE = "store"; 
const isAllowed = (val) => val === true || val === "允許" || String(val).toLowerCase() === "true";

// 全域變數：操作員實名綁定
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
          // 🌟 將 UID 送往 GAS 進行動態權限讀取
          verifyUidViaGas(window.userLineUid);
      }
  } catch (err) {
      console.warn("LIFF 啟動異常或超時", err);
      if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';
      Swal.fire('系統錯誤', 'LINE 授權載入失敗，請檢查網路後重新整理。', 'error');
  }
}

// 🌟 動態對接 Google Sheet 驗證
async function verifyUidViaGas(uid) {
    try {
        const fetchPromise = fetch(API, {
            method: 'POST',
            body: JSON.stringify({ action: "ssoFastCheck", lineUid: uid })
        });
        // 網路連線 5 秒強制 Timeout，杜絕轉圈圈卡死
        const fetchTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), 5000));
        
        const res = await Promise.race([fetchPromise, fetchTimeout]);
        const data = await res.json();
        
        if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';

        if (data.status === "success") {
            // 驗證成功，由 Google Sheet 回傳姓名與權限
            renderBackendPlatform(data.staff);
        } else {
            Swal.fire({
                title: '存取遭拒',
                text: data.message || '您沒有權限進入此系統',
                icon: 'error',
                allowOutsideClick: false,
                showConfirmButton: false
            });
        }
    } catch (err) {
        console.error("權限核對網路異常", err);
        if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';
        
        let errorMsg = '與資料庫連線中斷，請檢查網路後重新整理。';
        if(err.message === 'NETWORK_TIMEOUT') errorMsg = '系統連線逾時，請確認網路環境後重試。';
        
        Swal.fire({
            title: '連線錯誤',
            text: errorMsg,
            icon: 'error',
            allowOutsideClick: false,
            confirmButtonText: '重新整理',
            confirmButtonColor: '#ea580c'
        }).then(() => {
            window.location.reload();
        });
    }
}

function renderBackendPlatform(staffData) {
    // 實名追蹤綁定與 UI 渲染
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

window.getTimeOptionsHTML = function(selectedValue = '') {
    let options = '<option value="">請選擇時間</option>';
    let found = false;
    for(let h=9; h<=23; h++) {
        ['00','15','30','45'].forEach(m => {
            let hh = String(h).padStart(2,'0');
            if (selectedValue === `${hh}:${m}`) found = true;
        });
    }
    if (selectedValue && !found) {
        let [hStr, mStr] = selectedValue.split(':');
        let h = parseInt(hStr);
        let ampm = h < 12 ? '上午' : (h < 18 ? '下午' : '晚上');
        let displayH = h > 12 ? h - 12 : h;
        if(displayH === 0) displayH = 12;
        options += `<option value="${selectedValue}" selected>${selectedValue} (${ampm} ${displayH}:${mStr})</option>`;
    }
    for(let h=9; h<=23; h++) {
        ['00','15','30','45'].forEach(m => {
            let hh = String(h).padStart(2,'0');
            let ampm = h < 12 ? '上午' : (h < 18 ? '下午' : '晚上');
            let displayH = h > 12 ? h - 12 : h;
            if(displayH === 0) displayH = 12;
            let val = `${hh}:${m}`;
            let sel = (selectedValue === val) ? 'selected' : '';
            options += `<option value="${val}" ${sel}>${val} (${ampm} ${displayH}:${m})</option>`;
        });
    }
    return options;
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
