function toggleRem() {
    const method = v('fPay');
    if (method === '轉帳/匯款') {
        el('transferBox').classList.remove('hidden');
        el('packageBox').classList.add('hidden');
    } else if (method === '扣堂') {
        el('transferBox').classList.add('hidden');
        el('packageBox').classList.remove('hidden');
    } else {
        el('transferBox').classList.add('hidden');
        el('packageBox').classList.add('hidden');
    }
}

async function checkPackageAssets() {
    if(cart.length === 0) return alert('購物車內目前無會員，請先帶入中台清單。');
    const area = el('packageStatusArea'); 
    area.innerHTML = '連線讀取存摺中...';
    const names = cart.map(c => c.name);
    try {
        const r = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'checkPackageStatus', names: names }) }).then(x => x.json());
        if(r.status === 'success') {
            if(r.data.length === 0) {
                area.innerHTML = '目前資料庫尚無此會員的購買紀錄。<br>💡 結帳將自動為新客開戶建檔。';
            } else {
                let html = '';
                r.data.forEach(m => {
                    html += `<div style="margin-bottom:12px; padding-bottom:12px; border-bottom: 1px dashed var(--border);">
                                <span style="font-size: 16px; font-weight: bold; color: var(--primary);">${m.name}</span><br>
                                專案：${m.courseName}<br>
                                堂數：已用 <span style="color:#ef4444; font-weight:bold;">${m.used}</span> / 剩餘 <span style="color:#4ade80; font-weight:bold;">${m.remain}</span><br>
                                <span style="color:var(--text-light); font-size:12px;">(前次紀錄: ${m.lastRecord || '無'})</span>
                             </div>`;
                });
                area.innerHTML = html;
            }
        } else { 
            area.innerHTML = '讀取失敗：' + r.message; 
        }
    } catch(e) { 
        area.innerHTML = '網路連線異常。'; 
    }
}

async function loadPend() {
    const btn = el('btnFetchPending'); 
    if (btn) btn.innerText = '讀取中...';
    try {
        const memRes = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'fetchMembers' }) }).then(x=>x.json());
        const members = memRes.data || [];
        
        const r = await apiCall('fetchPendingCheckouts', {}); 
        el('pendArea').innerHTML = '';
        
        if (r && r.data.length > 0) {
            r.data.forEach(i => {
                const d = document.createElement('div'); 
                d.className = 'pending-item';
                const displayCourse = (i.course || '未定').replace(/\(.*?\)/g, '');
                d.innerText = `+ ${i.name} [${i.dateStr}] [${displayCourse}]`;
                
                d.onclick = () => {
                    let matchedCourse = "無痛滑罐放鬆-30分鐘";
                    let matchedPrice = 600;
                    const rawC = i.course || '';
                    
                    if (rawC.includes('深度') || rawC.includes('60分鐘')) { 
                        matchedCourse = "全身全方位深度修復-60分鐘"; matchedPrice = 2000; 
                    } else if (rawC.includes('全方位') || rawC.includes('90分鐘')) { 
                        matchedCourse = "全方位滑罐放鬆-90分鐘"; matchedPrice = 1600; 
                    } else if (rawC.includes('單部位')) { 
                        matchedCourse = "單部位舒緩修復"; matchedPrice = 600; 
                    } else if (rawC.includes('結構') || rawC.includes('平衡')) { 
                        matchedCourse = "全身結構養護"; matchedPrice = 1000; 
                    } else if (rawC.includes('套票') || rawC.includes('純購')) { 
                        matchedCourse = "專案套票/多堂課程 (純購買)"; matchedPrice = 0; 
                    } else if (rawC.includes('10分鐘') || rawC.includes('局部')) { 
                        matchedCourse = "局部無痛滑罐-10分鐘"; matchedPrice = 200; 
                    } else if (rawC.includes('15分鐘') || rawC.includes('肩頸')) { 
                        matchedCourse = "肩頸背套餐-15分鐘"; matchedPrice = 300; 
                    }

                    const memData = members.find(m => m.name === i.name);
                    let isVip = memData ? memData.isVip : false;
                    let finalPrice = isVip ? Math.round(matchedPrice * 0.88) : matchedPrice;

                    cart.push({
                        id: 'i' + Date.now() + Math.random().toString(36).substr(2,3),
                        name: i.name,
                        phone: i.phone,
                        course: matchedCourse,
                        hero: i.hero || '奎元',
                        basePrice: matchedPrice,
                        price: finalPrice,
                        note: '',
                        isVip: isVip,
                        vipName: memData ? memData.vipName : ''
                    });
                    renderCart();
                    if(v('fPay') === '扣堂') checkPackageAssets();
                };
                el('pendArea').appendChild(d);
            });
        } else {
            el('pendArea').innerText = '目前中台沒有待結帳的會員。';
        }
    } catch(e) { 
        console.error(e); 
    } finally { 
        if (btn) btn.innerText = '📥 載入中台待結帳清單'; 
    }
}

function renderCart() {
    el('cBody').innerHTML = ''; 
    let totalSum = 0;
    
    window.uc = (id, field, val) => { 
        const item = cart.find(x => x.id === id); 
        if (item) { 
            item[field] = val; 
            if (field === 'course') {
                item.basePrice = prices[val] || 0; 
            }
            if (item.isVip) {
                item.price = Math.round(item.basePrice * 0.88);
            } else {
                item.price = item.basePrice;
            }
            renderCart(); 
        } 
    };
    
    window.toggleVip = (id, isChecked) => {
        const item = cart.find(x => x.id === id); 
        if(item) {
            item.isVip = isChecked;
            item.price = isChecked ? Math.round(item.basePrice * 0.88) : item.basePrice;
            renderCart();
        }
    };

    cart.forEach(i => {
        totalSum += Number(i.price); 
        const c = i.course;
        el('cBody').innerHTML += `
        <div class="cart-item-card">
            <button class="cart-item-del" onclick="cart=cart.filter(x=>x.id!=='${i.id}');renderCart()">✕</button>
            <div class="cart-item-row" style="padding-right: 35px;">
                <div>
                    <label style="font-size:12px;margin-bottom:2px;">會員姓名</label>
                    <div class="autocomplete-container">
                        <input value="${i.name}" onkeyup="uc('${i.id}','name',this.value); showAutocomplete('cartName-${i.id}', 'cartDrop-${i.id}', null)" onfocus="showAutocomplete('cartName-${i.id}', 'cartDrop-${i.id}', null)" id="cartName-${i.id}" style="padding:6px;font-size:14px;" autocomplete="off">
                        <div id="cartDrop-${i.id}" class="autocomplete-list"></div>
                    </div>
                </div>
                <div>
                    <label style="font-size:12px;margin-bottom:2px;">調理師傅</label>
                    <select onchange="uc('${i.id}','hero',this.value)" style="padding:6px;font-size:14px;">
                        <option value="千芳" ${i.hero === '千芳' ? 'selected' : ''}>千芳</option>
                        <option value="奎元" ${i.hero === '奎元' ? 'selected' : ''}>奎元</option>
                    </select>
                </div>
            </div>
            
            <div style="margin-bottom:10px; font-size:13px; color:var(--primary); font-weight:bold;">
                <label style="display:inline;"><input type="checkbox" onchange="toggleVip('${i.id}', this.checked)" ${i.isVip ? 'checked' : ''}> 💎 啟用特約 88 折優惠</label>
                ${i.vipName ? `<span style="color:var(--text-light); font-size:12px; font-weight:normal;">(偵測：${i.vipName})</span>` : ''}
            </div>

            <div class="cart-item-row">
                <div style="flex:2;">
                    <label style="font-size:12px;margin-bottom:2px;">消費項目</label>
                    <select onchange="uc('${i.id}','course',this.value)" style="padding:6px;font-size:14px;">
                        <option value="局部無痛滑罐-10分鐘" ${c.includes('10分鐘') ? 'selected' : ''}>局部無痛滑罐-10分鐘</option>
                        <option value="肩頸背套餐-15分鐘" ${c.includes('15分鐘') ? 'selected' : ''}>肩頸背套餐-15分鐘</option>
                        <option value="無痛滑罐放鬆-30分鐘" ${c.includes('30分鐘') ? 'selected' : ''}>無痛滑罐放鬆-30分鐘</option>
                        <option value="全方位滑罐放鬆-90分鐘" ${c.includes('90分鐘') ? 'selected' : ''}>全方位滑罐放鬆-90分鐘</option>
                        <option value="單部位舒緩修復" ${c.includes('單部位') ? 'selected' : ''}>單部位舒緩修復</option>
                        <option value="全身結構養護" ${c.includes('結構') || c.includes('平衡') ? 'selected' : ''}>全身結構養護</option>
                        <option value="全身全方位深度修復-60分鐘" ${c.includes('60分鐘') || c.includes('深度') ? 'selected' : ''}>全身全方位深度修復-60分鐘</option>
                        <option value="專案套票/多堂課程 (純購買)" ${c.includes('套票') ? 'selected' : ''}>專案套票/多堂課程 (純購買)</option>
                        <option value="其他" ${c === '其他' ? 'selected' : ''}>其他</option>
                    </select>
                </div>
                <div style="flex:1;">
                    <label style="font-size:12px;margin-bottom:2px;">金額</label>
                    <input type="number" value="${i.price}" onchange="uc('${i.id}','price',this.value)" style="padding:6px;font-size:14px; font-weight:bold; color:var(--primary);">
                </div>
            </div>
            <div>
                <input value="${i.note}" placeholder="調理細節或備註..." onchange="uc('${i.id}','note',this.value)" style="padding:6px;font-size:13px;">
            </div>
        </div>`;
    });
    el('cSum').innerText = '$' + totalSum;
}

function base64ToBlob(base64, mime) {
    let byteString = atob(base64.split(',')[1]);
    let ab = new ArrayBuffer(byteString.length);
    let ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) { 
        ia[i] = byteString.charCodeAt(i); 
    }
    return new Blob([ab], {type: mime});
}

window.addEventListener('DOMContentLoaded', () => {
    const btnShare = el('btnUniversalShare');
    if(btnShare) {
        btnShare.onclick = async () => {
            if (!window.currentReceiptBase64) return;
            const blob = base64ToBlob(window.currentReceiptBase64, 'image/png');
            const file = new File([blob], window.currentReceiptFileName, { type: 'image/png' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try { 
                    await navigator.share({ files: [file], title: '錦葳結帳明細', text: '感謝您的蒞臨！' }); 
                } catch (error) {}
            } else {
                try {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = window.currentReceiptFileName; a.click();
                    window.URL.revokeObjectURL(url);
                } catch(e) {
                    alert('您的系統目前阻擋了直接下載功能。請直接長按畫面上的收據圖片即可存檔！');
                }
            }
        };
    }
});

async function processCart() {
    if (cart.length === 0) return alert('結帳核對清單內無資料！');
    
    const btn = el('btnCheckout'); 
    btn.innerText = '處理中，請稍候...'; 
    btn.disabled = true;
    
    const fid = 'F' + Date.now(); 
    el('rId').innerText = fid;
    
    const fd = v('fDate'), ft = v('fTime');
    let finalCheckoutTime = '';
    if (fd && ft) { 
        finalCheckoutTime = `${fd} ${ft}`; 
    } else {
        const nowObj = new Date(); 
        const tzOffset = nowObj.getTimezoneOffset() * 60000;
        finalCheckoutTime = (new Date(nowObj - tzOffset)).toISOString().slice(0, 16).replace('T', ' ');
    }
    el('rTm').innerText = finalCheckoutTime;
    
    const rawPayMethod = v('fPay'); 
    let finalPayMethodStr = rawPayMethod;
    if (rawPayMethod === '轉帳/匯款') {
        finalPayMethodStr = `轉帳/匯款 (${v('fRecAcc')})`;
    }
    el('rMth').innerText = finalPayMethodStr; 
    el('rCsh').innerText = v('fCash');
    
    const remVal = v('fRem');
    if (rawPayMethod === '轉帳/匯款' && remVal) { 
        el('rRemRow').style.display = 'flex'; 
        el('rRemNote').innerText = remVal; 
    } else { 
        el('rRemRow').style.display = 'none'; 
    }
    
    const genNote = v('fGenNote'); 
    el('rGenNoteBox').style.display = genNote ? 'block' : 'none';
    if (genNote) el('rGenNote').innerText = genNote;

    el('rItems').innerHTML = ''; 
    let grandTotal = 0;
    
    cart.forEach(i => {
        grandTotal += Number(i.price);
        const displayCourse = i.course.replace(/\(.*?\)/g, '');
        el('rItems').innerHTML += `
            <tr>
                <td style="font-weight:bold;">
                    ${i.name}<br>
                    <small style="color:#666; font-weight:normal;">
                        ${displayCourse} ${i.isVip ? '(88折)' : ''} ${i.note ? ' / ' + i.note : ''}
                    </small>
                </td>
                <td style="text-align:center;">1</td>
                <td style="text-align:right;">
                    $${i.price}<br>
                    <small style="color:#666;">(${i.hero})</small>
                </td>
            </tr>`;
    });
    
    el('rSum').innerText = '$' + grandTotal;
    
    html2canvas(el('receiptCaptureArea'), { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' }).then(async canvas => {
        const base64Data = canvas.toDataURL('image/png');
        const combinedNames = cart.map(c => c.name).join('_');
        const safeFileName = `錦葳健康美學中心_結帳明細_${combinedNames}_${fid}.png`.replace(/[\/\\:*?"<>|]/g, '');
        
        window.currentReceiptBase64 = base64Data; 
        window.currentReceiptFileName = safeFileName;
        
        const payload = { 
            orderId: fid, 
            paymentMethod: finalPayMethodStr, 
            remittanceNote: remVal, 
            cashier: v('fCash'), 
            startTime: finalCheckoutTime, 
            customerNames: combinedNames, 
            cartItems: cart, 
            generalNote: genNote, 
            receiptImageBase64: base64Data 
        };
        
        try {
            const response = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'createFinance', ...payload }) });
            const r = await response.json();
            btn.innerText = '確認合併結帳並產生電子明細圖'; 
            btn.disabled = false;
            if (r && r.status === 'success') {
                el('finalReceiptImage').src = base64Data; 
                el('receiptSaveModal').style.display = 'flex';
                cart = []; 
                renderCart(); 
                el('fGenNote').value = ''; 
                el('fRem').value = ''; 
                el('packageStatusArea').innerHTML = '';
            } else {
                alert('結帳線上存檔失敗：' + r.message);
            }
        } catch(e) { 
            btn.innerText = '確認合併結帳並產生電子明細圖'; 
            btn.disabled = false; 
            alert('網路異常，結帳失敗'); 
        }
    });
}

function closeReceiptModal() { 
    el('receiptSaveModal').style.display = 'none'; 
}

async function fetchSum() {
    el('sumData').classList.remove('hidden'); 
    const r = await apiCall('getSummary', {});
    if (r && r.status === 'success') { 
        el('vD').innerText = '$' + r.summary.daily; 
        el('vW').innerText = '$' + r.summary.weekly; 
        el('vM').innerText = '$' + r.summary.monthly; 
    }
}

async function searchFin() {
    const k = v('adjKw'); 
    if (!k) return alert('請輸入會員姓名或手機');
    const btn = el('btnSearchFinance'); 
    btn.innerText = '調閱中...';
    try {
        const response = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'searchFinanceRecords', keyword: k }) });
        const r = await response.json(); 
        renderFinanceRecords(r.data, 'adjArea');
    } catch(e) { 
    } finally { 
        btn.innerText = '手動搜尋歷史財務紀錄'; 
    }
}

function renderFinanceRecords(dataArray, targetElId) {
    const area = el(targetElId); 
    area.innerHTML = '';
    
    if (dataArray && dataArray.length > 0) {
        dataArray.forEach(i => {
            const c = i.course;
            let adjDate = '';
            let adjTime = '';
            if(i.date.includes(' ')) {
                [adjDate, adjTime] = i.date.split(' ');
            }
            
            area.innerHTML += `
                <div class="result-card" style="border-left-color:var(--primary);" id="f-${i.orderId}">
                    <strong>單號：${i.orderId}</strong> (${i.date})<br>
                    客戶：${i.name} | 金額：<span style="color:var(--primary);font-weight:bold;">$${i.amount}</span> (${i.method})<br>
                    項目：${c.replace(/\(.*?\)/g, '')}<br>
                    備註：<span style="color:var(--text-light);">${i.note || '無'}</span><br>
                    
                    <div class="result-actions" style="margin-top:10px;">
                        <button class="btn-small btn-del" style="background:#ef4444;" onclick="toggleVoidForm('${i.orderId}')">進行財務項目異動</button>
                    </div>
                    
                    <div id="voidForm-${i.orderId}" class="void-box" style="display:none; background:rgba(239, 68, 68, 0.05); padding:15px; border-radius:8px; border-left:4px solid #ef4444; margin-top:10px;">
                        <p style="color:#ef4444; font-size:12px; font-weight:bold; margin-top:0;">⚠️ 警告：此動作將作廢原單並產生一筆 -1 的新單覆蓋營收！</p>
                        
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <div style="flex:1;">
                                <label style="font-size:12px;">日期時間</label>
                                <div style="display:flex; gap:5px;">
                                    <input type="date" id="fAdjDate-${i.orderId}" value="${adjDate}" style="padding:6px; font-size:13px; flex:1;">
                                    <select id="fAdjTime-${i.orderId}" style="padding:6px; font-size:13px; flex:1;">${getTimeOptionsHTML(adjTime)}</select>
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <div style="flex:1;"><label style="font-size:12px;">姓名</label><input type="text" id="fAdjName-${i.orderId}" value="${i.name}" style="padding:6px; font-size:13px;"></div>
                            <div style="flex:1;"><label style="font-size:12px;">手機</label><input type="text" id="fAdjPhone-${i.orderId}" value="${i.phone || ''}" style="padding:6px; font-size:13px;"></div>
                        </div>

                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <div style="flex:2;">
                                <label style="font-size:12px;">消費項目</label>
                                <select id="fAdjCourse-${i.orderId}" style="padding:6px; font-size:13px;">
                                    <option value="局部無痛滑罐-10分鐘" ${c.includes('10分鐘')?'selected':''}>局部無痛滑罐-10分鐘</option>
                                    <option value="肩頸背套餐-15分鐘" ${c.includes('15分鐘')?'selected':''}>肩頸背套餐-15分鐘</option>
                                    <option value="無痛滑罐放鬆-30分鐘" ${c.includes('30分鐘')?'selected':''}>無痛滑罐放鬆-30分鐘</option>
                                    <option value="全方位滑罐放鬆-90分鐘" ${c.includes('90分鐘')?'selected':''}>全方位滑罐放鬆-90分鐘</option>
                                    <option value="單部位舒緩修復" ${c.includes('單部位')?'selected':''}>單部位舒緩修復</option>
                                    <option value="全身結構養護" ${c.includes('結構')||c.includes('平衡')?'selected':''}>全身結構養護</option>
                                    <option value="全身全方位深度修復-60分鐘" ${c.includes('60分鐘')?'selected':''}>全身全方位深度修復-60分鐘</option>
                                    <option value="專案套票/多堂課程 (純購買)" ${c.includes('套票')?'selected':''}>專案套票/多堂課程 (純購買)</option>
                                    <option value="其他" ${c === '其他'?'selected':''}>其他</option>
                                </select>
                            </div>
                            <div style="flex:1;">
                                <label style="font-size:12px;">實收金額</label>
                                <input type="number" id="fAdjAmt-${i.orderId}" value="${i.amount}" style="padding:6px; font-size:13px;">
                            </div>
                        </div>

                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <div style="flex:1;">
                                <label style="font-size:12px;">結帳方式</label>
                                <select id="fAdjPay-${i.orderId}" style="padding:6px; font-size:13px;">
                                    <option value="現金" ${i.method.includes('現金')?'selected':''}>現金</option>
                                    <option value="轉帳/匯款" ${i.method.includes('轉帳')||i.method.includes('匯款')?'selected':''}>轉帳/匯款</option>
                                    <option value="扣堂" ${i.method.includes('扣堂')?'selected':''}>扣堂</option>
                                </select>
                            </div>
                            <div style="flex:1;">
                                <label style="font-size:12px;">師傅</label>
                                <select id="fAdjHero-${i.orderId}" style="padding:6px; font-size:13px;">
                                    <option value="千芳" ${i.hero==='千芳'?'selected':''}>千芳</option>
                                    <option value="奎元" ${i.hero==='奎元'?'selected':''}>奎元</option>
                                </select>
                            </div>
                        </div>
                        
                        <label style="font-size:12px;">新備註</label>
                        <input type="text" id="fAdjNote-${i.orderId}" value="${i.note}" style="padding:6px; font-size:13px;">

                        <button class="btn-submit" style="background:#ef4444; color: white; margin-top:15px;" onclick="submitFinanceUpdate('${i.orderId}')">確認作廢並紀錄</button>
                    </div>
                </div>`;
        });
    } else {
        area.innerHTML = '<p style="text-align:center;">查無符合紀錄</p>';
    }
}

function toggleVoidForm(id) { 
    const box = el(`voidForm-${id}`); 
    box.style.display = box.style.display === 'block' ? 'none' : 'block'; 
}

async function submitFinanceUpdate(orderId) {
    if (!confirm(`警告：確定要變更單號 ${orderId} 嗎？此動作將會作廢原單並產生一筆 -1 的新單！`)) return;
    
    const newDate = v(`fAdjDate-${orderId}`) + ' ' + v(`fAdjTime-${orderId}`);

    const payload = {
        action: 'updateFinanceRecord',
        orderId: orderId,
        newDate: newDate,
        newName: v(`fAdjName-${orderId}`),
        newPhone: v(`fAdjPhone-${orderId}`),
        newCourse: v(`fAdjCourse-${orderId}`),
        newAmount: v(`fAdjAmt-${orderId}`),
        newPayMethod: v(`fAdjPay-${orderId}`),
        newHero: v(`fAdjHero-${orderId}`),
        newNote: v(`fAdjNote-${orderId}`)
    };

    try {
        const response = await fetch(API, { method: 'POST', body: JSON.stringify(payload) });
        const r = await response.json();
        if (r.status === 'success') {
            alert('該筆財務檔案已成功變更紀錄！');
            const rowEl = el(`f-${orderId}`); 
            rowEl.style.opacity = '0.5';
            rowEl.innerHTML = '<p style="color:#ef4444;text-align:center;font-weight:bold;margin-top:10px;">[此項紀錄已完成修改，並產生了新的 -1 單號，請重新搜尋]</p>';
        } else {
            alert('異動失敗：' + r.message);
        }
    } catch(e) { 
        alert('執行異動時發生網路錯誤'); 
    }
}
