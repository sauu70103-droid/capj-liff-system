/**
 * ============================================================================
 * 中台 / 後台 SSO 極速雙軌登入模組 (V3.5 支援「允許」字串對標)
 * ============================================================================
 */

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
          // 🚀 極速免密背景核對通道
          ssoFastLogin(window.userLineUid);
        } else {
          // 🔒 外部密碼鎖通道
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
      // ✅ 瞬間放行：呼叫中台渲染函式 (需在中台 app.js 實作 renderMiddlePlatform)
      renderMiddlePlatform(data.staff);
    } else {
      Swal.fire('驗證失效', data.message, 'error').then(promptExternalPinLogin);
    }
  });
}

function promptExternalPinLogin() {
  Swal.fire({
    title: '錦葳店務系統 - 安全鎖',
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
      renderMiddlePlatform(result.value.staff);
    } else {
      Swal.fire('錯誤', result.value.message || '驗證失敗', 'error').then(promptExternalPinLogin);
    }
  });
}

window.addEventListener("DOMContentLoaded", initSystemAuth);
