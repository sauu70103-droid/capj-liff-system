window.addEventListener('DOMContentLoaded', () => {
    if(el('bkStartTime')) el('bkStartTime').innerHTML = getTimeOptionsHTML();
    if(el('bkEndTime')) el('bkEndTime').innerHTML = getTimeOptionsHTML();
    if(el('fTime')) el('fTime').innerHTML = getTimeOptionsHTML();

    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localToday = (new Date(today - tzOffset)).toISOString().split('T')[0];
    
    if(el('bkStartDate')) el('bkStartDate').value = localToday;
    if(el('bkEndDate')) el('bkEndDate').value = localToday;
    if(el('fDate')) el('fDate').value = localToday;
});

window.toggleMultipleBox = () => {
    const box = el('multipleBox');
    if (box.classList.contains('hidden')) {
        box.classList.remove('hidden');
        window.currentBookingMode = 'multiple';
    } else {
        box.classList.add('hidden');
        el('bkRepeatCount').value = 1;
        window.currentBookingMode = 'single';
    }
};

window.autoCalcEndTime = () => {
    const startDate = el('bkStartDate').value;
    const startTime = el('bkStartTime').value;
    if (!startDate || !startTime) return;

    const course = el('bkCourse').value || "";
    let addMinutes = 60;
    if(course.includes("10分鐘")) addMinutes = 10;
    else if(course.includes("15分鐘")) addMinutes = 15;
    else if(course.includes("30分鐘")) addMinutes = 30;
    else if(course.includes("60分鐘") || course.includes("單部位舒緩")) addMinutes = 60;
    else if(course.includes("90分鐘")) addMinutes = 90;
    else if(course.includes("套票") || course.includes("純購")) addMinutes = 15;

    const [y, mo, d] = startDate.split('-');
    const [h, m] = startTime.split(':');
    let endObj = new Date(y, mo - 1, d, h, m);
    endObj.setMinutes(endObj.getMinutes() + addMinutes);

    const endY = endObj.getFullYear();
    const endMo = String(endObj.getMonth() + 1).padStart(2, '0');
    const endD = String(endObj.getDate()).padStart(2, '0');
    el('bkEndDate').value = `${endY}-${endMo}-${endD}`;

    const endH = String(endObj.getHours()).padStart(2, '0');
    const endM = String(endObj.getMinutes()).padStart(2, '0');
    el('bkEndTime').innerHTML = getTimeOptionsHTML(`${endH}:${endM}`);
};

window.loadOnlineRequests = async () => {
    const btn = el('btnLoadRequests');
    const area = el('onlineRequestsArea');
    btn.innerText = '連線讀取中...';
    try {
        const r = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'fetchOnlineBookings' }) }).then(x=>x.json());
        btn.innerText = '📥 載入最新預約申請';
        area.innerHTML = '';
        if (r.status === 'success' && r.data.length > 0) {
            r.data.forEach(i => {
                area.innerHTML += `
                <div class="result-card" style="border-left-color:#F37021;">
                    <strong>${i.name}</strong> (${i.phone})<br>
                    希望日期：<span style="color:#F37021; font-weight:bold;">${i.date} ${i.time}</span><br>
                    項目：${i.course}<br>
                    <button class="btn-small" style="background:#F37021; margin-top:10px; color:white;" onclick="approveRequest('${i.id}', '${i.name}', '${i.phone}', '${i.course}', '${i.date}', '${i.time}')">帶入審核</button>
                </div>`;
            });
        } else {
            area.innerHTML = '<p style="font-size:13px; color:#8A796D;">目前無待處理的線上申請。</p>';
        }
    } catch(e) { btn.innerText = '📥 載入最新預約申請'; alert('讀取失敗'); }
};

window.approveRequest = (reqId, name, phone, course, date, time) => {
    el('bkName').value = name;
    el('bkPhone').value = phone;
    const opts = el('bkCourse').options;
    for(let i=0; i<opts.length; i++) {
        if(opts[i].value.includes(course)) { el('bkCourse').selectedIndex = i; break; }
    }
    el('bkStartDate').value = date.replace(/\//g, '-');
    el('bkStartTime').value = time;
    window.autoCalcEndTime();
    window.currentOnlineReqId = reqId; 
    alert('已將申請資料帶入下方表單，請確認師傅與時間後點擊建立排程。');
};

window.submitBookingData = async () => {
    const rawName = v('bkName'); const rawPhone = v('bkPhone');
    const rawStartDate = v('bkStartDate'); const rawStartTime = v('bkStartTime');
    const rawEndDate = v('bkEndDate'); const rawEndTime = v('bkEndTime');

    if (!rawName || !rawPhone) return alert('請填寫會員姓名與手機！');
    if (!rawStartDate || !rawStartTime || !rawEndDate || !rawEndTime) return alert('請完整選擇時間！');

    const btn = document.querySelector('#bookingTab .btn-submit');
    btn.innerText = '排程寫入中...'; btn.disabled = true;

    const payload = {
        name: rawName, phone: rawPhone, people: v('bkPeople') || '1',
        course: v('bkCourse') || '其他', hero: v('bkHero') || '奎元',
        startDateTime: `${rawStartDate} ${rawStartTime}`, 
        endDateTime: `${rawEndDate} ${rawEndTime}`,
        note: v('bkNote') || '', mode: window.currentBookingMode || 'single',
        repeatCount: Number(v('bkRepeatCount') || 1),
        onlineReqId: window.currentOnlineReqId || ''
    };

    await apiCall('createBooking', payload, '預約成功寫入系統！');
    window.currentOnlineReqId = ''; 
    el('onlineRequestsArea').innerHTML = ''; 
    btn.innerText = '確認建立預約排程'; btn.disabled = false;
};

window.searchBks = async () => {
    const kw = v('srchKw');
    if(!kw) return alert('請輸入搜尋關鍵字！');
    const btn = el('btnSearch'); btn.innerText = '調閱中...';
    try {
        const r = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'searchBookings', keyword: kw }) }).then(x=>x.json());
        if(r.status === 'success') renderBks(r.data);
        else el('srchArea').innerHTML = '搜尋失敗：' + r.message;
    } catch(e) { el('srchArea').innerHTML = '網路連線異常，請稍後再試。'; }
    btn.innerText = '搜尋當日及未來預約紀錄';
};

window.renderBks = (data) => {
    const area = el('srchArea'); area.innerHTML = '';
    if(!data || data.length === 0) return area.innerHTML = '<p style="text-align:center;">查無符合的預約紀錄。</p>';

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
            備註：<span style="color:#8A796D">${i.note || '無'}</span><br>
            
            <div class="result-actions" style="margin-top:10px;">
                <button class="btn-small" style="background:#F37021; color:white;" onclick="toggleBookingEditForm('${i.id}')">修改改期</button>
                <button class="btn-small" style="background:#ef4444; color:white;" onclick="cancelBooking('${i.id}', '${i.eventId}')">取消預約</button>
            </div>

            <div id="editBk-${i.id}" style="display:none; background:#FAFAFA; padding:15px; border-radius:8px; border-left:4px solid #F37021; margin-top:10px;">
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
                <button class="btn-submit" style="background:#F37021; color:white; padding:10px; font-size:14px;" onclick="submitBookingUpdate('${i.id}', '${i.eventId}')">確認修改此排程</button>
            </div>
        </div>`;
    });
};

window.toggleBookingEditForm = (id) => {
    const b = el(`editBk-${id}`);
    b.style.display = b.style.display === 'block' ? 'none' : 'block';
};

window.cancelBooking = async (id, eventId) => {
    if(!confirm('確定要取消這筆預約嗎？')) return;
    await apiCall('cancelBooking', { id: id, eventId: eventId }, '預約已成功取消！');
    searchBks(); 
};

window.submitBookingUpdate = async (id, eventId) => {
    const sD = v(`ebSDate-${id}`); const sT = v(`ebSTime-${id}`);
    const eD = v(`ebEDate-${id}`); const eT = v(`ebETime-${id}`);
    if(!sD || !sT || !eD || !eT) return alert('日期與時間必須完整填寫！');
    if(!confirm('確定要修改此筆預約嗎？系統將進行舊單註記並重新建立新排程。')) return;

    const payload = {
        id: String(id), eventId: String(eventId),
        newStart: `${sD} ${sT}`, newEnd: `${eD} ${eT}`,
        newCourse: String(v(`ebCourse-${id}`) || '其他')
    };

    await apiCall('updateBooking', payload, '預約排程已成功修改與更新！');
    searchBks();
};
