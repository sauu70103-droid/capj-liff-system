// ==========================================
// 錦葳健康美學中心 - 核心設定檔 (config.js)
// 狀態：純淨版 (已解除 el/v 變數衝突)
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
window.currentBookingMode = 'single';
