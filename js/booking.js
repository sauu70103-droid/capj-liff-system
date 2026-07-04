// ==========================================
// 店務預約控制引擎
// ==========================================
function changeBookingMode(mode) {
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
}

function autoCalcEndTime() {
    const dVal = v('bkStartDate'), tVal = v('bkStartTime');
    const courseVal = v('bkCourse');
    if (!dVal || !tVal || !courseVal) return; 
    
    let addMinutes = 60; 
    const matchMins = courseVal.match(/(\d+)分鐘/);
    if (matchMins) addMinutes = parseInt(matchMins[1]);
    else if (courseVal.includes('單部位')) addMinutes = 30;
    else if (courseVal.includes('全身結構')) addMinutes = 60;
    
    const startDateObj = new Date(`${dVal}T${tVal}`);
    startDateObj.setMinutes(startDateObj.getMinutes() + addMinutes);
    
    const tzOffset = startDateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(startDateObj - tzOffset)).toISOString().slice(0, 16);
    const [outDate, outTime] = localISOTime.split('T');
    
    el('bkEndDate').value = outDate;
    el('bkEndTime').value = outTime;
}

async function submitBookingData() {
    const dS = v('bkStartDate'), tS = v('bkStartTime');
    const dE = v('bkEndDate'), tE = v('bkEndTime');
    if(!dS || !tS || !dE || !tE) return alert('請完整填寫日期與時間');

    const actualRepeatCount = currentBookingMode === 'single' ? 1 : v('bkRepeatCount');

    const payload = { 
        orderId: 'B' + Date.now(), 
        bookingType: currentBookingMode, 
        repeatCount: actualRepeatCount, 
        phone: v('bkPhone'), 
        customerName: v('bkName'), 
        people: v('bkPeople'), 
        courseType: v('bkCourse'), 
        heroStaff: v('bkHero'), 
        startTime: `${dS} ${tS}`, 
        endTime: `${dE} ${tE}`, 
        note: v('bkNote') 
    };
    
    await apiCall('createBooking', payload, '預約排程寫入成功！');
}

async function searchBks() {
    const k = v('srchKw'); if (!k) return alert('請輸入會員姓名或手機號碼查詢');
    const btn = el('btnSearch'); btn.innerText = '搜尋中...';
    try {
        const r = await apiCall('searchBookings', { keyword: k }); el('srchArea').innerHTML = '';
        if (r && r.data.length > 0) {
            r.data.forEach(i => {
                const [sDate, sTime] = (i.startTime || ' ').split(' ');
                const [eDate, eTime] = (i.endTime || ' ').split(' ');
                
                el('srchArea').innerHTML += `
                    <div class="result-card" id="bk-${i.orderId}">
                        <div class="result-info">
                            <strong>${i.name}</strong> - ${i.course.replace(/\(.*?\)/g, '')}<br>
                            時間：${i.startTime} | 師傅：${i.hero}<br>
                            備註：<span style="color:#94a3b8;">${i.note || '無'}</span>
                        </div>
                        <div class="result-actions">
                            <button class="btn-small btn-edit" onclick="toggleReschedule('${i.orderId}')">改期/變更</button>
                            <button class="btn-small btn-del" onclick="if(confirm('確定要取消此預約排程嗎？')) apiCall('cancelBooking',{orderId:'${i.orderId}'}).then(()=>el('bk-${i.orderId}').style.display='none')">取消預約</button>
                        </div>
                        <div class="reschedule-box" id="rBx-${i.orderId}" style="display:none; background:rgba(0,0,0,0.2); padding:15px; border-radius:6px; margin-top:15px;">
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <div style="flex:1;"><label style="font-size:12px;">姓名</label><input type="text" id="rn-${i.orderId}" value="${i.name}" style="padding:8px;"></div>
                                <div style="flex:1;"><label style="font-size:12px;">手機</label><input type="tel" id="rp-${i.orderId}" value="${i.phone}" style="padding:8px;"></div>
                                <div style="flex:1;"><label style="font-size:12px;">人數</label><input type="number" id="rpp-${i.orderId}" value="${i.people}" style="padding:8px;"></div>
                            </div>
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <div style="flex:2;">
                                    <label style="font-size:12px;">消費項目</label>
                                    <select id="rc-${i.orderId}" style="padding:8px; font-size:13px;">
                                        <option value="無痛滑罐放鬆(快速修復)-30分鐘" ${i.course.includes('無痛')?'selected':''}>無痛滑罐放鬆-30分鐘</option>
                                        <option value="全方位滑罐放鬆(全身修復)-90分鐘" ${i.course.includes('全方位')?'selected':''}>全方位滑罐放鬆-90分鐘</option>
                                        <option value="單部位舒緩修復(精準調理)" ${i.course.includes('單部位')?'selected':''}>單部位舒緩修復</option>
                                        <option value="全身結構養護(平衡調理)" ${i.course.includes('結構') || i.course.includes('平衡')?'selected':''}>全身結構養護</option>
                                        <option value="全身全方位深度修復-60分鐘" ${i.course.includes('深度')?'selected':''}>全身全方位深度修復-60分鐘</option>
                                        <option value="專案套票/多堂課程 (純購買)" ${i.course.includes('套票')?'selected':''}>專案套票/多堂課程</option>
                                        <option value="其他" ${i.course === '其他'?'selected':''}>其他</option>
                                    </select>
                                </div>
                                <div style="flex:1;">
                                    <label style="font-size:12px;">師傅</label>
                                    <select id="rh-${i.orderId}" style="padding:8px; font-size:13px;">
                                        <option value="千芳" ${i.hero==='千芳'?'selected':''}>千芳</option>
                                        <option value="奎元" ${i.hero==='奎元'?'selected':''}>奎元</option>
                                    </select>
                                </div>
                            </div>
                            <label style="font-size:12px;">新開始時間</label>
                            <div style="display:flex; gap:5px; margin-bottom:10px;">
                                <input type="date" id="nsD-${i.orderId}" value="${sDate}" style="flex:1; padding:8px;">
                                <input type="time" id="nsT-${i.orderId}" value="${sTime}" style="flex:1; padding:8px;">
                            </div>
                            <label style="font-size:12px;">新結束時間</label>
                            <div style="display:flex; gap:5px; margin-bottom:10px;">
                                <input type="date" id="neD-${i.orderId}" value="${eDate}" style="flex:1; padding:8px;">
                                <input type="time" id="neT-${i.orderId}" value="${eTime}" style="flex:1; padding:8px;">
                            </div>
                            <label style="font-size:12px;">備註</label>
                            <input type="text" id="rnote-${i.orderId}" value="${i.note}" style="margin-bottom:15px; padding:8px;">
                            <button class="btn-submit" onclick="submitReschedule('${i.orderId}')">💾 儲存並同步日曆</button>
                        </div>
                    </div>`;
            });
        } else el('srchArea').innerHTML = '<p style="text-align:center;color:#fca5a5;">查無目前生效的預約紀錄</p>';
    } catch(e) { console.error(e); } finally { btn.innerText = '搜尋預約紀錄'; }
}

function toggleReschedule(id) { const box = el(`rBx-${id}`); box.style.display = box.style.display === 'block' ? 'none' : 'block'; }

async function submitReschedule(id) { 
    const dS = v(`nsD-${id}`), tS = v(`nsT-${id}`), dE = v(`neD-${id}`), tE = v(`neT-${id}`);
    if (!dS || !tS || !dE || !tE) return alert('請完整選擇新的時間與日期'); 
    
    const payload = {
        orderId: id, 
        newName: v(`rn-${id}`),
        newPhone: v(`rp-${id}`),
        newPeople: v(`rpp-${id}`),
        newCourse: v(`rc-${id}`),
        newHero: v(`rh-${id}`),
        newStartTime: `${dS} ${tS}`, 
        newEndTime: `${dE} ${tE}`,
        newNote: v(`rnote-${id}`)
    };
    
    const r = await apiCall('rescheduleBooking', payload); 
    if (r && r.status === 'success') { alert('改期與變更已完成！'); searchBks(); } 
}
