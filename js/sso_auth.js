/**
 * ============================================================================
 * 中台 / 後台 SSO 極速雙軌登入模組 (V3.8 三維權限獨立分流版)
 * ============================================================================
 */

// 請開發端於套用此模組時，設定該系統之專屬權限代號 ('middle' 或 'store')
const SYSTEM_AUTH_TYPE = "middle"; // 或 "store"

function initSystemAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const isSso = urlParams.get('sso_auth') === 'true';

  liff.init({ liffId: LIFF_ID }).then(() => {
    if (!liff.isLoggedIn()) {
      liff.login();
    } else {
      liff.getProfile().then(profile => {
        window.userLineUid = profile.userId;
        
        if (isSso) {
          ssoFastLogin(window.userLineUid);
        } else {
          promptExternalPinLogin();
        }
      });
    }
  });
}

function ssoFastLogin(uid) {
  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: "ssoFastCheck", lineUid: uid })
  }).then(res => res.json()).then(data => {
    if (data.status === "success") {
      checkSystemPermissionAndRender(data.staff);
    } else {
      Swal.fire('驗證失效', data.message, 'error').then(promptExternalPinLogin);
    }
  });
}

function promptExternalPinLogin() {
  Swal.fire({
    title: '錦葳系統 - 安全鎖',
    input: 'password',
    inputPlaceholder: '請輸入您的專屬密碼',
    allowOutsideClick: false,
    allowEscapeKey: false,
    confirmButtonText: '解鎖',
    confirmButtonColor: '#B9936C',
    showLoaderOnConfirm: true,
    preConfirm: (pin) => {
      return fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "staffLogin", lineUid: window.userLineUid || "", pin: pin })
      }).then(res => res.json());
    }
  }).then((result) => {
    if (result.isConfirmed && result.value.status === "success") {
      checkSystemPermissionAndRender(result.value.staff);
    } else {
      Swal.fire('錯誤', result.value.message || '驗證失敗', 'error').then(promptExternalPinLogin);
    }
  });
}

// 嚴格攔截：核對通過後，還要確認是否擁有「該系統專屬」之權限
function checkSystemPermissionAndRender(staff) {
  if (SYSTEM_AUTH_TYPE === "middle" && !staff.authMiddle) {
    Swal.fire('權限不足', '您無權訪問中台系統', 'error'); return;
  }
  if (SYSTEM_AUTH_TYPE === "store" && !staff.authStore) {
    Swal.fire('權限不足', '您無權訪問後台店務系統', 'error'); return;
  }

  // ✅ 放行：執行該系統之畫面渲染
  renderSystemUI(staff); // 請於 app.js 實作此函式
}

window.addEventListener("DOMContentLoaded", initSystemAuth);
