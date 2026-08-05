// ==========================================
// 店務預約系統模組 (booking.js)
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    // 🌟 1. 初始化時間下拉選單 (解決卡住空白的問題)
    if(el('bkStartTime')) el('bkStartTime').innerHTML = getTimeOptionsHTML();
    if(el('bkEndTime')) el('bkEndTime').innerHTML = getTimeOptionsHTML();
    
    // 順便確保財務頁面的時間選單也有載入
    if(el('fTime')) el('fTime').innerHTML = getTimeOptionsHTML();

    // 🌟 2. 設定預設日期為「今天」
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localToday = (new Date(today - tzOffset)).toISOString().split('T')[0];
    
    if(el('bkStartDate')) el('bkStartDate').value = localToday;
    if(el('bkEndDate')) el('bkEndDate').value = localToday;
    if(el('fDate')) el('fDate').value = localToday;
});

// 🌟 核心升級：自動推算結束時間 (支援智慧讀取課程分鐘數)
window.autoCalcEndTime = () => {
    const startDate = el('bkStartDate').value;
    const startTime = el('bkStartTime').value;
    
    // 如果還沒選好開始時間，就不動作
    if (!startDate || !startTime) return;

    // 取得目前選擇的消費項目
    const course = el('bkCourse').value || "";
    
    // 預設加 60 分鐘 (1小時)
    let addMinutes = 60;
    
    // 智慧判斷：讀取最新菜單的字眼來決定自動推算的時間長度
    if(course.includes("10分鐘")) addMinutes = 10;
    else if(course.includes("15分鐘")) addMinutes = 15;
    else if(course.includes("30分鐘")) addMinutes = 30;
    else if(course.includes("60分鐘") || course.includes("單部位舒緩")) addMinutes = 60;
    else if(course.includes("90分鐘")) addMinutes = 90;
    else if(course.includes("套票") || course.includes("純購")) addMinutes = 15; // 純購買抓個15分鐘緩衝

    // 解析開始日期與時間
    const [y, mo, d] = startDate.split('-');
    const [h, m] = startTime.split(':');

    // 建立時間物件並加上推算的分鐘數 (原生支援跨日計算)
    let endObj = new Date(y, mo - 1, d, h, m);
    endObj.setMinutes(endObj.getMinutes() + addMinutes);

    // 轉回 YYYY-MM-DD 格式
    const endY = endObj.getFullYear();
    const endMo = String(endObj.getMonth() + 1).padStart(2, '0');
    const endD = String(endObj.getDate()).padStart(2, '0');
    el('bkEndDate').value = `${endY}-${endMo}-${endD}`;

    // 轉回 HH:mm 格式
    const endH = String(endObj.getHours()).padStart(2, '0');
    const endM = String(endObj.getMinutes()).padStart(2, '0');
    const finalEndTime = `${endH}:${endM}`;

    // 更新結束時間下拉選單，並自動選中推算出來的時間
    el('bkEndTime').innerHTML = getTimeOptionsHTML(finalEndTime);
};

// 切換預約模式 (單次/多次)
window.changeBookingMode = (mode) => {
    currentBookingMode = mode;
    if (mode === 'multiple') {
        el('modeMultiple').classList.add('active');
        el('modeSingle').classList.remove('active');
        el('multipleBox').classList.remove('hidden');
    } else {
        el('modeSingle').classList.add('active');
        el('modeMultiple').classList.remove('active');
        el('multipleBox').classList.add('hidden');
    }
};

// 送出建立預約排程
window.submitBookingData = async () => {
    const name = v('bkName');
    const phone = v('bkPhone');
    const startDate = v('bkStartDate');
    const startTime = v('bkStartTime');
    const endDate = v('bkEndDate');
    const endTime = v('bkEndTime');

    if (!name || !phone) return alert('請填寫會員姓名與手機！');
    if (!startDate || !startTime || !endDate || !endTime) return alert('請完整選擇開始與結束的日期時間！');

    const btn = document.querySelector('#bookingTab .btn-submit');
    btn.innerText = '預約排程寫入中...';
    btn.disabled = true;

    const startDateTime = `${startDate} ${startTime}`;
    const endDateTime = `${endDate} ${endTime}`;

    const payload = {
        mode: currentBookingMode,
        name: name,
        phone: phone,
        people: v('bkPeople'),
        course: v('bkCourse'),
        hero: v('bkHero'),
        startDateTime: startDateTime,
        endDateTime: endDateTime,
        note: v('bkNote'),
        repeatCount: v('bkRepeatCount') || 4
    };

    await apiCall('createBooking', payload, '預約成功寫入行事曆與資料庫！');

    btn.innerText = '確認建立預約排程';
    btn.disabled = false;
};

// 搜尋預約紀錄
window.searchBks = async () => {
    const kw = v('srchKw');
    if(!kw) return alert('請輸入搜尋關鍵字！');
    
    const btn = el('btnSearch');
    btn.innerText = '調閱中...';

    try {
        const r = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'searchBookings', keyword: kw }) }).then(x=>x.json());
        if(r.status === 'success') {
            renderBks(r.data);
        } else {
            el('srchArea').innerHTML = '搜尋失敗：' + r.message;
        }
    } catch(e) {
        el('srchArea').innerHTML = '網路連線異常，請稍後再試。';
    }
    btn.innerText = '搜尋預約紀錄';
};

// 渲染預約紀錄卡片
window.renderBks = (data) => {
    const area = el('srchArea');
    area.innerHTML = '';
    if(!data || data.length === 0) {
        area.innerHTML = '<p style="text-align:center;">查無符合的預約紀錄。</p>';
        return;
    }

    data.forEach(i => {
        let sD = '', sT = '', eD = '', eT = '';
        if(i.start && i.start.includes(' ')) { [sD, sT] = i.start.split(' '); }
        if(i.end && i.end.includes(' ')) { [eD, eT] = i.end.split(' '); }

        area.innerHTML += `
        <div class="result-card" id="bk-${i.id}">
            <strong>${i.name}</strong> (${i.phone})<br>
            時間：${i.start} ~ ${i.end}<br>
            項目：${i.course}<br>
            師傅：${i.hero}<br>
            備註：<span style="color:#94a3b8">${i.note || '無'}</span><br>
            
            <div class="result-actions" style="margin-top:10px;">
                <button class="btn-small" style="background:#3b82f6;" onclick="toggleBookingEditForm('${i.id}')">修改改期</button>
                <button class="btn-small btn-del" style="background:#ef4444;" onclick="cancelBooking('${i.id}', '${i.eventId}')">取消預約</button>
            </div>

            <div id="editBk-${i.id}" class="void-box" style="display:none; background:rgba(59, 130, 246, 0.1); padding:15px; border-radius:8px; border-left:4px solid #3b82f6; margin-top:10px;">
                <div style="display:flex; gap:10px; margin-bottom:10px;">
                    <div style="flex:1;">
                        <label style="font-size:12px;">新開始時間</label>
                        <input type="date" id="ebSDate-${i.id}" value="${sD}" style="padding:6px; font-size:13px; width:100%; margin-bottom:5px;">
                        <select id="ebSTime-${i.id}" style="padding:6px; font-size:13px; width:100%;">${getTimeOptionsHTML(sT)}</select>
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:12px;">新結束時間</label>
                        <input type="date" id="ebEDate-${i.id}" value="${eD}" style="padding:6px; font-size:13px; width:100%; margin-bottom:5px;">
                        <select id="ebETime-${i.id}" style="padding:6px; font-size:13px; width:100%;">${getTimeOptionsHTML(eT)}</select>
                    </div>
                </div>
                <div style="margin-bottom:10px;">
                    <label style="font-size:12px;">新課程項目</label>
                    <select id="ebCourse-${i.id}" style="padding:6px; font-size:13px; width:100%;">
                        <option value="局部無痛滑罐(精準放鬆)-10分鐘" ${i.course.includes('10分鐘')?'selected':''}>局部無痛滑罐(精準放鬆)-10分鐘</option>
                        <option value="肩頸背套餐(滑罐＋定罐)-15分鐘" ${i.course.includes('15分鐘')?'selected':''}>肩頸背套餐(滑罐＋定罐)-15分鐘</option>
                        <option value="無痛滑罐放鬆(快速修復)-30分鐘" ${i.course.includes('30分鐘')?'selected':''}>無痛滑罐放鬆-30分鐘</option>
                        <option value="全方位滑罐放鬆(全身修復)-90分鐘" ${i.course.includes('90分鐘')?'selected':''}>全方位滑罐放鬆-90分鐘</option>
                        <option value="單部位舒緩修復(精準調理)" ${i.course.includes('單部位')?'selected':''}>單部位舒緩修復</option>
                        <option value="全身結構養護(平衡調理)" ${i.course.includes('結構')||i.course.includes('平衡')?'selected':''}>全身結構養護</option>
                        <option value="全身全方位深度修復-60分鐘" ${i.course.includes('60分鐘')?'selected':''}>全身全方位深度修復-60分鐘</option>
                        <option value="專案套票/多堂課程 (純購買)" ${i.course.includes('套票')?'selected':''}>專案套票/多堂課程</option>
                        <option value="其他" ${i.course==='其他'?'selected':''}>其他</option>
                    </select>
                </div>
                <button class="btn-submit" style="background:#3b82f6; color:white;" onclick="submitBookingUpdate('${i.id}', '${i.eventId}')">確認修改此排程 (將同步更新行事曆)</button>
            </div>
        </div>`;
    });
};

window.toggleBookingEditForm = (id) => {
    const b = el(`editBk-${id}`);
    b.style.display = b.style.display === 'block' ? 'none' : 'block';
};

window.cancelBooking = async (id, eventId) => {
    if(!confirm('確定要取消這筆預約嗎？這將會同步從 Google 行事曆中刪除。')) return;
    await apiCall('cancelBooking', { id: id, eventId: eventId }, '預約已成功取消！');
    searchBks(); 
};

window.submitBookingUpdate = async (id, eventId) => {
    const sD = v(`ebSDate-${id}`);
    const sT = v(`ebSTime-${id}`);
    const eD = v(`ebEDate-${id}`);
    const eT = v(`ebETime-${id}`);

    if(!sD || !sT || !eD || !eT) return alert('日期與時間必須完整填寫！');

    if(!confirm('確定要修改此筆預約嗎？系統將進行舊單註記並重新建立新排程。')) return;

    const payload = {
        id: id,
        eventId: eventId,
        newStart: `${sD} ${sT}`,
        newEnd: `${eD} ${eT}`,
        newCourse: v(`ebCourse-${id}`)
    };

    await apiCall('updateBooking', payload, '預約排程已成功修改與更新！');
    searchBks();
};
