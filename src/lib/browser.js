// In-app browsers (WhatsApp, Instagram, Facebook, TikTok…) usually can't finish the
// GitHub sign-in popup. We detect them to tell students to open the page in a real browser.
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Snapchat|TikTok|musical_ly|Twitter|MicroMessenger|; wv\)/i;

export function inAppBrowserName(ua = navigator.userAgent) {
  if (!IN_APP.test(ua)) return null;
  if (/WhatsApp/i.test(ua)) return 'WhatsApp';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook';
  if (/TikTok|musical_ly/i.test(ua)) return 'TikTok';
  return 'una app';
}

export const isAndroid = (ua = navigator.userAgent) => /Android/i.test(ua);

// Opens the current page in Chrome on Android (intent URL); iOS has no equivalent
export function chromeIntentUrl(href = window.location.href) {
  const url = new URL(href);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;end`;
}
