// ==========================================
// 核心設定與共用工具
// ==========================================
const API = 'https://script.google.com/macros/s/AKfycbwvFhB4fX_h3W2BdHadQOXo1VJzUaEzmiO93kxoNlaOLBwJz0tblFWPABB9q18aDIS4/exec';

const prices = {
    "無痛滑罐放鬆(快速修復)-30分鐘": 600, 
    "全方位滑罐放鬆(全身修復)-90分鐘": 1600, 
    "單部位舒緩修復(精準調理)": 600, 
    "全身結構養護(平衡調理)": 1000, 
    "全身全方位深度修復-60分鐘": 2000,
    "專案套票/多堂課程 (純購買)": 0
};

let cart = [];
let memberDatabase = []; 
let currentBookingMode = 'single';

const v = id => document.getElementById(id).value;
const el = id => document.getElementById(id);

async function apiCall(action, payload, msg) {
    try {
        const response = await fetch(API, { 
            method: 'POST', 
            body: JSON.stringify({ action: action, ...payload, orderId: 'B' + Date.now() }) 
        });
        const r = await response.json();
        if (r.status === 'success') {
            if (msg) alert(msg);
            if (action === 'createBooking') {
                el('bkName').value = ''; el('bkPhone').value = ''; el('bkNote').value = '';
            }
            return r;
        } else {
            alert('作業失敗：' + r.message);
        }
    } catch(e) { 
        alert('網路連線異常，請稍後再試。'); 
    }
}
