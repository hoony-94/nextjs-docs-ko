export type ViewMode = 'both' | 'ko' | 'en';
export type Theme = 'light' | 'dark';

export const VIEW_KEY = 'docs-view-mode';
export const THEME_KEY = 'docs-theme';
export const PREFERENCE_EVENT = 'docs-preference-change';

/** 첫 화면이 그려지기 전에 테마와 보기 모드를 <html>에 적용한다. */
export const preferenceScript = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem('${THEME_KEY}')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
d.classList.toggle('dark',t==='dark');
var v=localStorage.getItem('${VIEW_KEY}');
d.dataset.view=(v==='ko'||v==='en')?v:'both';
}catch(e){document.documentElement.dataset.view='both';}})();`;
