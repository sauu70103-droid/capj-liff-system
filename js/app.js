/**
 * ============================================================================
 * 錦葳健康美學中心 - 後台店務系統 (app.js)
 * V4.7 專屬 LIFF 靜默通關令 (雙軌制：LIFF極速通關 + 平滑降級密碼鎖)
 * ============================================================================
 */

if (typeof API === 'undefined') {
    window.API = 'https://script.google.com/macros/s/AKfycbwvFhB4fX_h3W2BdHadQOXo1VJzUaEzmiO93kxoNlaOLBwJz0tblFWPABB9q18aDIS4/exec';
}

function el(id) { return document.getElementById(id); }
function v(id) { return el(id) ? el(id).value : ''; }

window.currentOperator = '未登入';

// 🌟 V4.7 專屬 LIFF ID 與降級密碼
const LIFF_ID = '2011305352-C27AFX04';
const FALLBACK_PIN = '89668966';

async function initSystemAuth() {
    try {
        const liffInitPromise = liff.init({ liffId: LIFF_ID });
        const liffTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('LIFF_TIMEOUT')), 5000));
        
        await Promise.race([liffInitPromise, liffTimeout]);
        
        if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            window.userLineUid = profile.userId;
            await verifyUidViaGas(window.userLineUid);
        } else {
            // 未登入則平滑降級
            promptLocalPinLogin();
        }
    } catch (err) {
        console.warn("LIFF 啟動異常或超時，執行平滑降級", err);
        promptLocalPinLogin();
    } finally {
        // 🚨 終極防護：無論如何強制消滅遮罩
        if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';
    }
}

// 🌟 向 GAS API 請求靜默驗證
async function verifyUidViaGas(uid) {
    try {
        const fetchPromise = fetch(API, {
            method: 'POST',
            body: JSON.stringify({ action: "ssoFastCheck", lineUid: uid })
        });
        const fetchTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), 5000));
        
        const res = await Promise.race([fetchPromise, fetchTimeout]);
        const data = await res.json();
        
        // 🎯 精準對標 GAS API 回傳的「後台權限」 (Auth_Store)
        if (data.status === "success" && data.staff && (data.staff.Auth_Store === true || data.staff.Auth_Store === '允許')) {
            // 靜默通關成功
            renderBackendPlatform(data.staff.Staff_Name, true);
        } else {
            // 無權限或查無此人 -> 平滑降級
            console.warn("API 驗證失敗或無後台權限，降級至本地密碼鎖");
            promptLocalPinLogin();
        }
    } catch (err) {
        console.error("權限核對網路異常，降級至本地密碼鎖", err);
        promptLocalPinLogin();
    }
}

// 🌟 平滑降級：本地密碼鎖與實名選擇
function promptLocalPinLogin() {
    // 雙重確保沒有遮罩卡死
    if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';

    Swal.fire({
        title: '錦葳店務後台',
        input: 'password',
        inputPlaceholder: '請輸入通行密碼',
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: '解鎖',
        confirmButtonColor: '#ea580c',
        preConfirm: (pin) => {
            if (pin !== FALLBACK_PIN) {
                Swal.showValidationMessage('密碼錯誤，請重新輸入');
                return false;
            }
            return true;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: '請選擇操作人員',
                input: 'select',
                inputOptions: {
                    '奎元': '奎元',
                    '千芳': '千芳'
                },
                allowOutsideClick: false,
                allowEscapeKey: false,
                confirmButtonText: '進入系統',
                confirmButtonColor: '#ea580c'
            }).then((res) => {
                if (res.isConfirmed) {
                    // 密碼解鎖者預設放行所有頁籤
                    renderBackendPlatform(res.value, true);
                }
            });
        }
    });
}

// 渲染與解鎖介面
function renderBackendPlatform(operatorName, hasFinanceAuth = true) {
    window.currentOperator = operatorName;
    localStorage.setItem('Staff_Name', operatorName);
    
    // UI 實名標示與預設值帶入
    if(el('fCash')) el('fCash').value = operatorName;
    if(el('staffBadge')) el('staffBadge').innerText = `目前操作員：${operatorName}`;
    
    // 依權限解鎖頁籤
    if (hasFinanceAuth) {
        if(el('btnTabFinance')) el('btnTabFinance').classList.remove('ui-guard-locked');
        if(el('btnTabAdjust')) el('btnTabAdjust').classList.remove('ui-guard-locked');
        if(el('btnTabPoints')) el('btnTabPoints').classList.remove('ui-guard-locked');
    }
    
    const appContainer = el('mainAppContainer');
    if(appContainer) appContainer.classList.remove('ui-guard-locked');
    
    if(el('loadingOverlay')) el('loadingOverlay').style.display = 'none';

    const defaultTabBtn = document.getElementById('btnTabBooking');
    if (defaultTabBtn) window.switchTab('bookingTab', defaultTabBtn);
}

window.addEventListener("DOMContentLoaded", initSystemAuth);

// ==========================================
// 共用工具庫 (維持完整功能)
// ==========================================
window.switchTab = function(tabId, btn) {
    document.querySelectorAll('.form-section').forEach(el => { el.classList.remove('active'); el.style.display = 'none'; });
    document.querySelectorAll('.tab-btn').forEach(el => { el.classList.remove('active'); });
    const target = document.getElementById(tabId);
    if (target) { target.classList.add('active'); target.style.display = 'block'; }
    if (btn) btn.classList.add('active');
};

// 呼叫 API 時自動夾帶全域操作員名稱 (實名蓋章)
window.apiCall = async function(action, payload, successMsg) {
    const finalOperator = window.currentOperator !== '未登入' ? window.currentOperator : (localStorage.getItem('Staff_Name') || '系統');
    const finalPayload = { action: action, operator: finalOperator, ...payload };
    
    const fetchPromise = fetch(API, { method: 'POST', body: JSON.stringify(finalPayload) });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000));
    
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
            Swal.fire('連線逾時', '⚠️ 系統連線逾時！\n請檢查網路連線後重試。', 'error'); 
        } else { 
            Swal.fire('網路異常', '系統網路異常，請稍後再試。', 'error'); 
        }
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
    
    const dataSrc = window.membersData || window.memberDatabase || [];
    
    if (dataSrc && dataSrc.length > 0) {
        const val = input.value.trim(); list.innerHTML = '';
        if (!val) { list.style.display = 'none'; return; }
        
        const filtered = dataSrc.filter(m => m.name.includes(val) || m.phone.includes(val)).slice(0, 5);
        
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

document.addEventListener('click', function (e) {
    document.querySelectorAll('.autocomplete-list').forEach(list => {
        if (!list.contains(e.target) && e.target.tagName !== 'INPUT') { list.style.display = 'none'; }
    });
});
