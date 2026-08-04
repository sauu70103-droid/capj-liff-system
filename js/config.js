// ==========================================
// 核心設定與共用工具
// ==========================================
const API = 'https://script.google.com/macros/s/AKfycbwvFhB4fX_h3W2BdHadQOXo1VJzUaEzmiO93kxoNlaOLBwJz0tblFWPABB9q18aDIS4/exec';

const prices = {
    "局部無痛滑罐(精準放鬆)-10分鐘": 200, 
    "肩頸背套餐(滑罐＋定罐)-15分鐘": 300,
    "無痛滑罐放鬆(快速修復)-30分鐘": 600,
    "單部位舒緩修復(精準調理)": 600, 
    "全身全方位深度修復-60分鐘": 2000,
    "專案套票/多堂課程 (純購買)": 0
};

let cart = [];
let memberDatabase = []; 
let currentBookingMode = 'single';

const v = id => document.getElementById(id).value;
const el = id => document.getElementById(id);

// 🌟 終極脫鉤引擎：自動產生精美的 24 小時/上下午 時間選單
function getTimeOptionsHTML(selectedValue = '') {
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
}

// 通訊與清除機制
async function apiCall(action, payload, msg) {
    try {
        const response = await fetch(API, { 
            method: 'POST', 
            body: JSON.stringify({ action: action, ...payload }) 
        });
        const r = await response.json();
        
        if (r.status === 'success') {
            if (msg) alert(msg);
            
            if (action === 'createBooking') {
                if(el('bkName')) el('bkName').value = ''; 
                if(el('bkPhone')) el('bkPhone').value = ''; 
                if(el('bkNote')) el('bkNote').value = '';
                
                if(el('bkStartDate')) el('bkStartDate').value = '';
                if(el('bkStartTime')) el('bkStartTime').value = '';
                if(el('bkEndDate')) el('bkEndDate').value = '';
                if(el('bkEndTime')) el('bkEndTime').value = '';
                
                if(el('bkCourse')) el('bkCourse').selectedIndex = 0;
                if(el('bkRepeatCount')) el('bkRepeatCount').value = 4;
                if(typeof changeBookingMode === 'function') changeBookingMode('single');
            }
            return r;
        } else {
            alert('作業失敗：' + r.message);
        }
    } catch(e) { 
        alert('網路連線異常，請稍後再試。'); 
    }
}
