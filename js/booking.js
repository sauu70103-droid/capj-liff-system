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
    else if(course.includes("60分鐘") || course.includes("單部位")) addMinutes = 60;
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

// 🌟 自動辨識「新增預約」與「取消申請」，處理完的絕對不會再出現
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
                // 判斷是否為顧客提出的「取消申請」
                const isCancel = i.status.includes('取消') || i.course.includes('取消') || (i.note && i.note.includes('取消'));

                if (isCancel) {
                    let cancelTime = i.times.length > 0 ? `${i.times[0].date} ${i.times[0].time}` : '未知時間';
                    area.innerHTML += `
                    <div class="result-card" id="req-card-${i.id}" style="border-left-color:#ef4444; background: #fff5f5; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                        <strong style="color:#ef4444; font-size:16px;">🚨 顧客提出取消預約申請</strong><br>
                        <strong style="color:var(--text-main); font-size:16px;">${i.name || '未登錄姓名'}</strong> <span style="color:var(--text-light);">(${i.phone})</span><br>
                        欲取消時段：<span style="color:#ef4444; font-weight:bold; font-size:16px;">${cancelTime}</span><br>
                        <button type="button" class="btn-submit" style="padding:10px; font-size:14px; margin-top:12px; background:#ef4444; color:white; border-radius:6px; display:block; width:100%; text-align:center;" 
                            onclick="approveOnlineCancel('${i.id}', '${i.phone}', '${cancelTime}')">
                            🗑️ 確認並直接取消原排程
                        </button>
                    </div>`;
                } else {
                    let timeButtonsHtml = '';
                    i.times.forEach((t, idx) => {
                        if(t.date && t.time) {
                            timeButtonsHtml += `
                            <button type="button" class="btn-submit" style="padding:10px; font-size:14px; margin-top:8px; background:var(--primary); color:white; border-radius:6px; display:block; width:100%; text-align:left;" 
                                onclick="approveRequest('${i.id}', '${i.name}', '${i.phone}', '${i.course}', '${t.date}', '${t.time}')">
                                ✅ 帶入方案 ${idx + 1}：${t.date} ${t.time}
                            </button>`;
                        }
                    });

                    area.innerHTML += `
                    <div class="result-card" id="req-card-${i.id}" style="border-left-color:var(--primary); background: #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                        <strong style="color:var(--text-main); font-size:16px;">${i.name || '未登錄姓名'}</strong> <span style="color:var(--text-light);">(${i.phone})</span><br>
                        項目：<span style="color:var(--text-main); font-weight:bold;">${i.course}</span><br>
                        <div style="margin-top:8px; margin-bottom: 12px;">
                            ${timeButtonsHtml}
                        </div>
                        <button type="button" class="btn-cancel-action" style="padding:10px; font-size:14px; background:rgba(239, 68, 68, 0.1); color:#ef4444; border:1px solid #ef4444; width:100%; border-radius:6px; cursor:pointer;" 
                            onclick="rejectRequest('${i.id}')">
                            ❌ 無適合時間，取消申請並另約
                        </button>
                    </div>`;
                }
            });
        } else {
            area.innerHTML = '<p style="font-size:14px; color:var(--text-light); text-align:center;">目前無待處理的線上申請。</p>';
        }
    } catch(e) { 
        btn.innerText = '📥 載入最新預約申請'; 
        alert('讀取失敗，請確認網路連線'); 
    }
};

window.approveOnlineCancel = async (reqId, phone, timeStr) => {
    if(!confirm('確定要直接取消該客人的此筆排程嗎？系統將同步作廢並寫回紅燈狀態。')) return;
    try {
        const payload = { action: 'approveOnlineCancel', reqId: reqId, phone: phone, timeStr: timeStr };
        const res = await fetch(API, { method: 'POST', body: JSON.stringify(payload) }).then(x=>x.json());
        alert('✅ 已成功取消該排程，並同步更新會員系統為紅燈標記！');
        el(`req-card-${reqId}`).style.display = 'none'; // 立即從畫面上移除
    } catch(e) { 
        alert('取消失敗，請檢查網路連線。'); 
    }
};

window.rejectRequest = async (reqId) => {
    if(!confirm('確定要取消此申請，並標記為「無適合時間」嗎？')) return;
    try {
        const payload = { action: 'rejectOnlineBooking', onlineReqId: reqId };
        await fetch(API, { method: 'POST', body: JSON.stringify(payload) });
        alert('已將該申請標記為取消。請記得透過官方 LINE 與顧客聯繫確認新時間！');
        el(`req-card-${reqId}`).style.display = 'none'; // 立即從畫面上移除
    } catch (e) {
        alert('註記失敗，請檢查網路狀態。');
    }
};

window.approveRequest = (reqId, name, phone, course, date, time) => {
    if(name) el('bkName').value = name;
    if(phone) el('bkPhone').value = phone;
    
    if (course) {
        const opts = el('bkCourse').options;
        let matched = false;
        for(let i=0; i<opts.length; i++) {
            if(opts[i].value.includes(course) || course.includes(opts[i].value.split('-')[0])) {
                el('bkCourse').selectedIndex = i;
                matched = true;
                break;
            }
        }
        if(!matched) el('bkCourse').value = '其他';
    }

    if (date) el('bkStartDate').value = date;
    if (time) {
        el('bkStartTime').innerHTML = getTimeOptionsHTML(time);
        el('bkStartTime').value = time;
    }

    window.autoCalcEndTime();
    window.currentOnlineReqId = reqId; 

    el('bkName').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
        alert('✅ 已將申請資料完美帶入！\n請確認「會員姓名」、「師傅」與「結束時間」後，點擊下方的【確認建立預約排程】即可。');
    }, 300);
};

window.submitBookingData = async () => {
    const rawName = v('bkName'); const rawPhone = v('bkPhone');
    const rawStartDate = v('bkStartDate'); const rawStartTime = v('bkStartTime');
    const rawEndDate = v('bkEndDate'); const rawEndTime = v('bkEndTime');

    if (!rawName || !rawPhone) return alert('請填寫會員姓名與手機！');
    if (!rawStartDate || !rawStartTime || !rawEndDate || !rawEndTime) return alert('請完整選擇時間！');

    const btn = document.querySelector('#bookingTab .btn-submit');
    const originalText = btn.innerText;
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

    await apiCall('createBooking', payload, '✅ 預約已成功寫入系統與行事曆！');
    
    if (window.currentOnlineReqId) {
        el(`req-card-${window.currentOnlineReqId}`).style.display = 'none'; // 立即移除該卡片
    }
    window.currentOnlineReqId = ''; 
    btn.innerText = originalText; btn.disabled = false;
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
    if(!data || data.length === 0) return area.innerHTML = '<p style="text-align:center; color:var(--text-light);">查無符合的預約紀錄。</p>';

    data.forEach(i => {
        let sD = '', sT = '', eD = '', eT = '';
        if(i.start && i.start.includes(' ')) { [sD, sT] = i.start.split(' '); }
        if(i.end && i.end.includes(' ')) { [eD, eT] = i.end.split(' '); }

        area.innerHTML += `
        <div class="result-card" id="bk-${i.id}">
            <strong>${i.name}</strong> (${i.phone})<br>
            時間：<span style="color:var(--primary); font-weight:bold;">${i.start} ~ ${i.end}</span><br>
            項目：${i.course}<br>
            師傅：${i.hero}<br>
            備註：<span style="color:var(--text-light);">${i.note || '無'}</span><br>
            
            <div class="result-actions" style="margin-top:15px;">
                <button class="btn-small" style="background:var(--primary); color:white;" onclick="toggleBookingEditForm('${i.id}')">修改改期</button>
                <button class="btn-small" style="background:#ef4444; color:white;" onclick="cancelBooking('${i.id}', '${i.eventId}')">取消預約</button>
            </div>

            <div id="editBk-${i.id}" style="display:none; background:#FAFAFA; padding:15px; border-radius:8px; border:1px solid var(--border); margin-top:15px;">
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
                        <option value="無痛滑罐放鬆(快速修復)-30分鐘" ${i.course.includes('30分鐘')?'selected':''}>無痛滑罐放鬆(快速修復)-30分鐘</option>
                        <option value="全方位滑罐放鬆(全身修復)-90分鐘" ${i.course.includes('90分鐘')?'selected':''}>全方位滑罐放鬆(全身修復)-90分鐘</option>
                        <option value="單部位舒緩修復(精準調理)" ${i.course.includes('單部位')?'selected':''}>單部位舒緩修復(精準調理)</option>
                        <option value="全身結構養護(平衡調理)" ${i.course.includes('結構')||i.course.includes('平衡')?'selected':''}>全身結構養護(平衡調理)</option>
                        <option value="全身全方位深度修復-60分鐘" ${i.course.includes('60分鐘')?'selected':''}>全身全方位深度修復-60分鐘</option>
                        <option value="專案套票/多堂課程 (純購買)" ${i.course.includes('套票')?'selected':''}>專案套票/多堂課程</option>
                        <option value="其他" ${i.course==='其他'?'selected':''}>其他</option>
                    </select>
                </div>
                <button class="btn-submit" style="background:var(--primary); color:white; padding:12px; font-size:14px;" onclick="submitBookingUpdate('${i.id}', '${i.eventId}')">確認修改此排程</button>
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
