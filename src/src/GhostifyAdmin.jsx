/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  GHOSTIFY ULTIMATE v3.1                                       ║
 * ║  © 2025 Ghostify — Code PROPRIÉTAIRE                         ║
 * ║  Toute reproduction ou revente interdite sans accord écrit    ║
 * ║  Contact : support@ghostify.fr                                ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut,
  onAuthStateChanged, updateProfile
} from "firebase/auth";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc,
  collection, query, getDocs, onSnapshot, deleteDoc,
  addDoc, orderBy, serverTimestamp, increment
} from "firebase/firestore";
import { initializeApp } from "firebase/app";

// ═══════════════════════════════════════════════════════
// FIREBASE — variables d'environnement (.env / Netlify)
// ═══════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MSG_ID,
  appId:             import.meta.env.VITE_FB_APP_ID
};
const FIREBASE_LIVE = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "undefined");
let auth, db;
if (FIREBASE_LIVE) {
  const app = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app);
  db   = getFirestore(app);
}

// ═══════════════════════════════════════════════════════
// PAYPAL — variable d'environnement
// ═══════════════════════════════════════════════════════
const PAYPAL_CLIENT = import.meta.env.VITE_PAYPAL_CLIENT;
const PAYPAL_PLANS  = {
  PRO:      { id: import.meta.env.VITE_PP_PLAN_PRO,       price:9.99,  name:"Pro"      },
  ULTIMATE: { id: import.meta.env.VITE_PP_PLAN_ULTIMATE,  price:19.99, name:"Ultimate" },
  UNLIMITED:{ id: import.meta.env.VITE_PP_PLAN_UNLIMITED, price:39.99, name:"Illimité" }
};

// ═══════════════════════════════════════════════════════
// EMAILS — masqués via env, jamais dans le bundle
// ═══════════════════════════════════════════════════════
const ADMIN_EMAIL   = import.meta.env.VITE_ADMIN_EMAIL;
const SUPPORT_EMAIL = "support@ghostify.fr";
const ADMIN_EMAILS  = [import.meta.env.VITE_ADMIN_EMAIL];

// ═══════════════════════════════════════════════════════
// ADSENSE
// ═══════════════════════════════════════════════════════
const ADS_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || "ca-pub-2527584002466358";
const AD_SLOTS   = {
  INFEED:        "2345678901",
  MOBILE_STICKY: "4567890123",
};

// ═══════════════════════════════════════════════════════
// PLANS
// ═══════════════════════════════════════════════════════
const TIERS = { FREE:0, PRO:1, ULTIMATE:2, UNLIMITED:3 };
const PLANS  = {
  FREE:     { label:"Gratuit",  price:0,     maxSites:1,   maxArt:1,  maxPhotos:0,   maxVideos:0,   commission:9,  templates:5,  logoGen:false, showAds:true,  socialPost:false },
  PRO:      { label:"Pro",      price:9.99,  maxSites:5,   maxArt:3,  maxPhotos:15,  maxVideos:5,   commission:7,  templates:12, logoGen:false, showAds:true,  socialPost:false, ppId:PAYPAL_PLANS.PRO.id      },
  ULTIMATE: { label:"Ultimate", price:19.99, maxSites:10,  maxArt:5,  maxPhotos:50,  maxVideos:15,  commission:5,  templates:20, logoGen:true,  showAds:false, socialPost:false, ppId:PAYPAL_PLANS.ULTIMATE.id },
  UNLIMITED:{ label:"Illimité", price:39.99, maxSites:999, maxArt:10, maxPhotos:999, maxVideos:999, commission:3,  templates:50, logoGen:true,  showAds:false, socialPost:true,  ppId:PAYPAL_PLANS.UNLIMITED.id },
};

// ═══════════════════════════════════════════════════════
// TEMPLATES (50)
// ═══════════════════════════════════════════════════════
const TEMPLATES = [
  { id:"minimal",   name:"Minimal",       bg:"#F5F3EE", ac:"#2D6A4F", tier:"FREE"     },
  { id:"luxe",      name:"Luxe Noir",     bg:"#0A0A0A", ac:"#D4AF37", tier:"FREE"     },
  { id:"tech",      name:"Tech Blue",     bg:"#0F172A", ac:"#3B82F6", tier:"FREE"     },
  { id:"nature",    name:"Nature",        bg:"#F0F7F4", ac:"#4A7C59", tier:"FREE"     },
  { id:"bold",      name:"Bold Red",      bg:"#FFF5F5", ac:"#E53E3E", tier:"FREE"     },
  { id:"editorial", name:"Editorial",     bg:"#FFFEF9", ac:"#1A1A2E", tier:"PRO"      },
  { id:"pastel",    name:"Pastel",        bg:"#FEF0F5", ac:"#D63384", tier:"PRO"      },
  { id:"glass",     name:"Glassmorphism", bg:"#667EEA", ac:"#FFFFFF", tier:"PRO"      },
  { id:"brutalist", name:"Brutalist",     bg:"#FFFF00", ac:"#000000", tier:"PRO"      },
  { id:"mono",      name:"Monochrome",    bg:"#FFFFFF", ac:"#111111", tier:"PRO"      },
  { id:"retro",     name:"Rétro 70s",     bg:"#F5E6D3", ac:"#C65500", tier:"PRO"      },
  { id:"cyber",     name:"Cyber",         bg:"#0D001A", ac:"#00FFD1", tier:"PRO"      },
  { id:"aurora",    name:"Aurora",        bg:"#0A0A2E", ac:"#7C3AED", tier:"ULTIMATE" },
  { id:"bento",     name:"Bento Grid",    bg:"#F9FAFB", ac:"#6366F1", tier:"ULTIMATE" },
  { id:"cremeLuxe", name:"Crème Luxe",    bg:"#FAF8F5", ac:"#9B7653", tier:"ULTIMATE" },
  { id:"neon",      name:"Neon Night",    bg:"#050010", ac:"#FF006E", tier:"ULTIMATE" },
  { id:"organic",   name:"Organic",       bg:"#F2EDE4", ac:"#6B7C5C", tier:"ULTIMATE" },
  { id:"arch",      name:"Architecture",  bg:"#F8F8F8", ac:"#2C2C2C", tier:"ULTIMATE" },
  { id:"sport",     name:"Sport",         bg:"#111111", ac:"#FF3D00", tier:"ULTIMATE" },
  { id:"kids",      name:"Kids Fun",      bg:"#FFFDE7", ac:"#FF6B6B", tier:"ULTIMATE" },
  ...Array.from({length:30}, (_,i)=>({
    id:`premium${i+1}`, name:`Premium ${i+1}`,
    bg:`hsl(${i*12},${i%2?15:40}%,${i%2?10:96}%)`,
    ac:`hsl(${i*12+30},68%,48%)`, tier:"UNLIMITED"
  }))
];

// ═══════════════════════════════════════════════════════
// SMART CHATBOT FAQ
// ═══════════════════════════════════════════════════════
const FAQ = [
  { k:["plan","prix","tarif","abonnement","coût"],
    r:"📋 Nos plans : Gratuit (0€), Pro (9,99€/mois), Ultimate (19,99€/mois), Illimité (39,99€/mois). Upgradez depuis votre profil !" },
  { k:["video","vidéo","générer","génération"],
    r:"🎬 La génération vidéo est disponible dès le plan Pro (5/mois), Ultimate (15/mois) et Illimité (∞). Le plan Gratuit inclut uniquement les photos." },
  { k:["template","modèle","design","boutique","thème"],
    r:"🎨 Templates disponibles : 5 (Gratuit) · 12 (Pro) · 20 (Ultimate) · 50 (Illimité). Choisissez en créant une boutique !" },
  { k:["logo","marque","brand"],
    r:"✨ Le générateur de logo IA est inclus dans les plans Ultimate et Illimité. Accédez-y dans Profil ou lors de la création d'une boutique." },
  { k:["commission","vente","revenu","argent"],
    r:"💰 Commissions : Gratuit 9% · Pro 7% · Ultimate 5% · Illimité 3%. Plus votre plan est élevé, plus vous gardez de revenus !" },
  { k:["paypal","paiement","payer"],
    r:"💳 Nous acceptons PayPal pour tous les abonnements. Cliquez sur 'Activer' sur votre plan choisi dans l'onglet Profil." },
  { k:["aliexpress","cj","cjdropshipping","fournisseur","produit"],
    r:"🏪 Collez l'URL du produit AliExpress ou CJDropshipping dans votre boutique. Ghostify détecte la plateforme automatiquement !" },
  { k:["parrainage","referral","code","ami"],
    r:"🎁 Partagez votre code de parrainage depuis l'onglet Profil. Vous gagnez 1 mois offert pour chaque ami qui s'inscrit !" },
  { k:["pub","publicité","adsense","annonce"],
    r:"📢 Les publicités sont présentes sur les plans Gratuit et Pro. Passez Ultimate ou Illimité pour en être exempt totalement." },
];
const autoReply = (msg) => {
  const low = msg.toLowerCase();
  for (const { k, r } of FAQ)
    if (k.some(kw => low.includes(kw))) return r;
  return null;
};

// ═══════════════════════════════════════════════════════
// MOCK DATA (mode démo sans Firebase)
// ═══════════════════════════════════════════════════════
const DEMO_USER = { uid:"demo_uid", email:"demo@ghostify.fr", name:"DemoUser", plan:"FREE", referralCode:"DEMO8X1Z", emailVerified:true };
const DEMO_SITES = [{
  slug:"demo-store-1", name:"TechStore Demo", template:"tech", color:"#3B82F6",
  articles:[{ id:1, name:"Produit 1", url:"https://aliexpress.com/item/123", platform:"AliExpress", media:{photos:[],videos:[]}, stats:{views:142,orders:3} }]
}];

// ═══════════════════════════════════════════════════════
// URL PARSER
// ═══════════════════════════════════════════════════════
const parseProductURL = (url) => {
  try { new URL(url); } catch { return null; }
  if (url.includes("aliexpress.com"))  return { platform:"AliExpress",  icon:"🛒" };
  if (url.includes("cjdropshipping"))  return { platform:"CJDropshipping", icon:"📦" };
  if (url.includes("zendrop"))         return { platform:"Zendrop",     icon:"⚡" };
  if (url.includes("temu.com"))        return { platform:"Temu",        icon:"🔴" };
  if (url.includes("1688.com"))        return { platform:"1688",        icon:"🇨🇳" };
  return { platform:"Autre", icon:"🔗" };
};

// ═══════════════════════════════════════════════════════
// ICÔNES
// ═══════════════════════════════════════════════════════
const Ic = ({ n, s=18, c="currentColor" }) => {
  const map = {
    ghost:   <svg width={s} height={s} viewBox="0 0 32 32" fill="none"><path d="M16 4C10.477 4 6 8.477 6 14v12.5l3-3 3.5 3.5 3.5-3.5 3.5 3.5 3.5-3.5 3 3V14c0-5.523-4.477-10-10-10z" fill={c}/><circle cx="12.5" cy="14" r="2" fill="white"/><circle cx="19.5" cy="14" r="2" fill="white"/></svg>,
    shop:    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 5h14l-1.5 8H4.5L3 5z" stroke={c} strokeWidth="1.5"/><circle cx="7" cy="16.5" r="1" fill={c}/><circle cx="13" cy="16.5" r="1" fill={c}/></svg>,
    image:   <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="14" rx="2" stroke={c} strokeWidth="1.5"/><circle cx="7" cy="8" r="1.5" fill={c}/><path d="M2 14l4-4 3 3 2-2 5 5" stroke={c} strokeWidth="1.4"/></svg>,
    cog:     <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" stroke={c} strokeWidth="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
    chart:   <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M2 18h16M4 14l3-4 3 2 4-6" stroke={c} strokeWidth="1.5"/></svg>,
    users:   <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M14 6a3 3 0 11-6 0 3 3 0 016 0zM2 18v-2a4 4 0 014-4h8a4 4 0 014 4v2" stroke={c} strokeWidth="1.5"/></svg>,
    ticket:  <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M2 5h16v10H2V5zM6 8h8M6 12h4" stroke={c} strokeWidth="1.5"/></svg>,
    coupon:  <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M2 5h16v10H2V5z" stroke={c} strokeWidth="1.5"/><circle cx="16" cy="10" r="2" stroke={c} strokeWidth="1.5"/></svg>,
    plus:    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
    trash:   <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 6h14M8 6V4h4v2M5 6l1 11h8l1-11" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
    zap:     <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M11 2L4 11h7l-2 7 7-9h-7l2-7z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/></svg>,
    star:    <svg width={s} height={s} viewBox="0 0 20 20" fill={c}><path d="M10 2l2.4 5 5.6.5-4 3.8 1.1 5.5L10 14l-5.1 2.8 1.1-5.5L2 7.5l5.6-.5z"/></svg>,
    chat:    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M4 14l-2 2V5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H4z" stroke={c} strokeWidth="1.5"/><circle cx="7" cy="9" r="1" fill={c}/><circle cx="10" cy="9" r="1" fill={c}/><circle cx="13" cy="9" r="1" fill={c}/></svg>,
    share:   <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><circle cx="15" cy="5" r="2" stroke={c} strokeWidth="1.5"/><circle cx="5" cy="10" r="2" stroke={c} strokeWidth="1.5"/><circle cx="15" cy="15" r="2" stroke={c} strokeWidth="1.5"/><path d="M7 9l6-3M7 11l6 3" stroke={c} strokeWidth="1.3"/></svg>,
    brand:   <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 17L10 3l7 14H3z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/><path d="M6 13h8" stroke={c} strokeWidth="1.3"/></svg>,
    lock:    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="5" y="9" width="10" height="8" rx="1.5" stroke={c} strokeWidth="1.5"/><path d="M7 7V5a3 3 0 016 0v2" stroke={c} strokeWidth="1.5"/></svg>,
    check:   <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M4 10l4.5 4.5L16 6" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
    eye:     <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" stroke={c} strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke={c} strokeWidth="1.5"/></svg>,
    mail:    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M2 5h16v10H2z" stroke={c} strokeWidth="1.5"/><path d="M2 5l8 5 8-5" stroke={c} strokeWidth="1.5"/></svg>,
    tag:     <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 3h7l7 7-7 7-7-7V3z" stroke={c} strokeWidth="1.5"/><circle cx="7" cy="7" r="1" fill={c}/></svg>,
    bar:     <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="3" y="12" width="3" height="6" fill={c} rx="1"/><rect x="8.5" y="7" width="3" height="11" fill={c} rx="1"/><rect x="14" y="3" width="3" height="15" fill={c} rx="1"/></svg>,
    menu:    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h14M3 14h14" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>,
    x:       <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke={c} strokeWidth="1.8" strokeLinecap="round"/></svg>,
    copy:    <svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="7" y="7" width="10" height="10" rx="2" stroke={c} strokeWidth="1.5"/><path d="M13 7V5a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2" stroke={c} strokeWidth="1.5"/></svg>,
  };
  return map[n] || null;
};

// ═══════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F5F3EE;--w:#FFFFFF;--s1:#F9F8F5;--b0:#EAE8E2;--b1:#D8D5CE;--b2:#C4C0B8;
  --t0:#16140F;--t1:#2E2B25;--t2:#6B6760;--t3:#A8A49C;
  --ac:#2D6A4F;--acl:#E8F4EE;--acm:#B7DECA;
  --gold:#D4AF37;--goldl:#FEF8E7;
  --adm:#7C3AED;--adml:#F3EEFF;--admm:#C4B5FD;
  --ind:#3B5BDB;--indl:#EEF2FF;
  --danger:#b91c1c;--dangerl:#fee2e2;
  --hf:'Fraunces',Georgia,serif;--bf:'DM Sans',system-ui,sans-serif;
}
@media(prefers-color-scheme:dark){:root{
  --bg:#0F0E0A;--w:#1C1A16;--s1:#222019;--b0:#2A2720;--b1:#3A3730;--b2:#4A4740;
  --t0:#F5F3EE;--t1:#E0DDD6;--t2:#9A9590;--t3:#6B6760;
}}
html,body{background:var(--bg);color:var(--t1);font-family:var(--bf);font-size:15px;line-height:1.6;height:100%}
*{-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;background:var(--b0)}::-webkit-scrollbar-thumb{background:var(--b2);border-radius:2px}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes ghostFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes goldPulse{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.5)}60%{box-shadow:0 0 0 8px rgba(212,175,55,0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes stickySlide{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
.au{animation:fadeUp .42s cubic-bezier(.22,1,.36,1) both}
.ai{animation:fadeIn .3s ease both}
.as{animation:slideIn .3s cubic-bezier(.22,1,.36,1) both}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:11px 20px;border-radius:10px;font-family:var(--bf);font-size:13.5px;font-weight:500;cursor:pointer;transition:all .17s;border:none;outline:none;letter-spacing:-.01em}
.btn-sm{padding:7px 12px;font-size:12.5px;border-radius:8px}
.btn-xs{padding:4px 9px;font-size:12px;border-radius:6px}
.btn-p{background:var(--t0);color:#fff}.btn-p:hover{background:#2a2720;transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.2)}
.btn-ac{background:var(--ac);color:#fff}.btn-ac:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-gold{background:linear-gradient(135deg,var(--gold),#B8941F);color:#1a1000;font-weight:600;animation:goldPulse 2.5s infinite}.btn-gold:hover{filter:brightness(1.08)}
.btn-o{background:transparent;color:var(--t1);border:1.5px solid var(--b1)}.btn-o:hover{border-color:var(--ac);color:var(--ac)}
.btn-d{background:var(--dangerl);color:var(--danger)}.btn-d:hover{background:#fca5a5}
.btn:disabled{opacity:.36;cursor:not-allowed;transform:none!important;animation:none!important}
.btn:active:not(:disabled){transform:scale(.97)!important}
.inp{width:100%;background:var(--w);border:1.5px solid var(--b1);color:var(--t0);padding:11px 14px;border-radius:10px;font-size:14px;outline:none;font-family:var(--bf);transition:all .17s}
.inp:focus{border-color:var(--ac);box-shadow:0 0 0 3px var(--acl)}
.inp:disabled{background:var(--s1);color:var(--t3)}
.inp-sm{padding:8px 12px;font-size:13px}
.card{background:var(--w);border:1px solid var(--b0);border-radius:18px;box-shadow:0 2px 10px rgba(0,0,0,.05)}
.card-h{transition:transform .2s,box-shadow .2s}.card-h:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,.08)}
.tag{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:600;letter-spacing:.02em}
.tg{background:var(--acl);color:var(--ac)}.tgold{background:var(--goldl);color:#8B6914}.tgray{background:var(--b0);color:var(--t2)}.tpur{background:var(--adml);color:var(--adm)}.tblue{background:var(--indl);color:var(--ind)}
.spin{width:18px;height:18px;border:2.5px solid var(--b1);border-top-color:var(--ac);border-radius:50%;animation:spin .65s linear infinite;display:inline-block}
.spin-w{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .65s linear infinite}
.toast{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:9999;padding:11px 20px;border-radius:12px;font-size:13.5px;font-weight:500;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.16);animation:fadeUp .3s;pointer-events:none}
.t-ok{background:var(--ac);color:white}.t-err{background:var(--danger);color:white}.t-info{background:var(--ind);color:white}
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg)}
.tab-btn{background:none;border:none;font-size:14.5px;font-weight:500;padding:8px 14px;cursor:pointer;color:var(--t2);font-family:var(--bf);border-bottom:2px solid transparent;transition:all .14s}
.tab-btn.active{color:var(--ac);border-bottom-color:var(--ac)}
.dnav{display:flex;align-items:center;gap:9px;width:100%;padding:9px 12px;border-radius:10px;border:none;background:transparent;font-family:var(--bf);font-size:13.5px;font-weight:500;color:var(--t2);cursor:pointer;transition:all .14s;text-align:left;position:relative}
.dnav:hover{background:var(--s1);color:var(--t0)}.dnav.active{background:var(--acl);color:var(--ac);font-weight:600}
.badge{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:var(--danger);color:white;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700;min-width:18px;text-align:center}
.prog{height:5px;background:var(--b0);border-radius:3px;overflow:hidden;margin-top:3px}
.prog-f{height:100%;border-radius:3px;background:var(--ac);transition:width .5s cubic-bezier(.22,1,.36,1)}
.tpl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:10px}
.tpl-card{border-radius:11px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all .18s;aspect-ratio:.68;position:relative}
.tpl-card.sel{border-color:var(--ac);box-shadow:0 0 0 3px var(--acl)}.tpl-card:hover:not(.locked){transform:scale(1.05)}.tpl-card.locked{opacity:.35;cursor:not-allowed}
.tpl-body{width:100%;height:72%;display:flex;flex-direction:column;gap:3px;padding:7px}
.tpl-label{text-align:center;font-size:10px;font-weight:600;padding:4px 2px;background:var(--w);color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;margin-top:12px}
.mcard{border-radius:9px;overflow:hidden;border:1px solid var(--b0);aspect-ratio:1;transition:transform .18s;background:var(--s1)}.mcard:hover{transform:scale(1.05)}
.mcard img{width:100%;height:100%;object-fit:cover}
/* AD — discret, intégré naturellement, sans bordure agressive */
.ad-slot{border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--t3);font-size:11px;background:var(--s1);gap:3px;border:1px solid var(--b0)}
.ad-lbl{font-size:9px;color:var(--t3);text-align:center;letter-spacing:.07em;text-transform:uppercase;margin-bottom:2px;opacity:.55}
/* Sticky — slide depuis le bas après scroll */
.ad-sticky{position:fixed;bottom:0;left:0;right:0;z-index:700;background:var(--w);border-top:1px solid var(--b0);padding:4px 12px 6px;animation:stickySlide .4s cubic-bezier(.22,1,.36,1)}
.plan-card{background:var(--w);border:2px solid var(--b0);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:9px;transition:all .2s;position:relative}
.plan-card.hot{border-color:var(--gold);box-shadow:0 0 0 3px var(--goldl)}
.plan-card:hover{transform:translateY(-4px);box-shadow:0 14px 36px rgba(0,0,0,.1)}
.logo-gen{background:linear-gradient(135deg,var(--adml),var(--w));border:2px solid var(--admm);border-radius:16px;padding:18px;margin-bottom:16px}
.logo-prev{width:96px;height:96px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;font-family:var(--hf);color:white;margin:0 auto 10px;transition:all .3s}
.ref-box{background:var(--indl);border:1.5px solid var(--ind);border-radius:11px;padding:11px 14px;display:flex;align-items:center;gap:9px;cursor:pointer;transition:all .18s;font-size:13px;color:var(--ind);font-weight:600}
.ref-box:hover{background:var(--ind);color:white}
.upg-cta{padding:13px;background:linear-gradient(135deg,var(--goldl),var(--w));border:1.5px solid var(--gold);border-radius:13px;cursor:pointer;transition:transform .18s;margin-top:12px}
.upg-cta:hover{transform:scale(1.02)}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:52px 24px;color:var(--t3);text-align:center;gap:10px}
.gf{animation:ghostFloat 3s ease-in-out infinite;display:inline-block}
.chat-btn{position:fixed;bottom:22px;right:22px;z-index:800;background:var(--ac);color:white;border:none;border-radius:60px;padding:12px 17px;cursor:pointer;box-shadow:0 8px 24px rgba(45,106,79,.38);display:flex;align-items:center;gap:7px;font-weight:600;font-family:var(--bf);font-size:13.5px;transition:all .2s}
.chat-btn:hover{transform:scale(1.04);filter:brightness(1.08)}
.chat-panel{position:fixed;bottom:76px;right:22px;width:340px;max-width:calc(100vw - 44px);background:var(--w);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.18);z-index:801;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--b0);animation:fadeUp .28s}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.52);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;backdrop-filter:blur(3px)}
.atbl{width:100%;border-collapse:collapse}
.atbl th,.atbl td{padding:11px;text-align:left;border-bottom:1px solid var(--b0);font-size:13px}
.atbl th{font-weight:600;color:var(--t2);font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.tkt{padding:11px;border:1px solid var(--b0);border-radius:11px;margin-bottom:7px;cursor:pointer;transition:background .14s}
.tkt:hover{background:var(--s1)}.tkt.sel{background:var(--acl);border-color:var(--acm)}
.stat-card{background:var(--s1);border-radius:12px;padding:14px;text-align:center}
.sparkline{overflow:visible}
.onboard{background:linear-gradient(135deg,var(--acl),var(--w));border:1.5px solid var(--acm);border-radius:16px;padding:18px;margin-bottom:20px}
.onboard-step{display:flex;align-items:center;gap:10px;padding:8px 0;font-size:13.5px}
.onboard-step .dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.dot-done{background:var(--ac);color:white}.dot-todo{background:var(--b0);color:var(--t2)}
.skeleton{background:linear-gradient(90deg,var(--b0) 25%,var(--b1) 50%,var(--b0) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px}
.demo-badge{display:inline-flex;align-items:center;padding:2px 8px;background:var(--indl);color:var(--ind);border-radius:20px;font-size:10px;font-weight:600;letter-spacing:.03em;margin-left:6px}
@media(max-width:720px){
  .sidebar{position:fixed;z-index:700;height:100vh;transition:transform .3s;transform:translateX(-100%)}
  .sidebar.open{transform:translateX(0)}
  .main{padding:16px!important}
  .mobile-only{display:flex!important}
  .hide-mob{display:none!important}
}
.mobile-only{display:none}
`;

// ═══════════════════════════════════════════════════════
// ADSENSE — discret, sans bordure dashed
// ═══════════════════════════════════════════════════════
const AdUnit = ({ slot, h=90, w }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(_) {}
  }, [slot]);
  return (
    <div>
      <div className="ad-lbl">Sponsorisé</div>
      <div ref={ref} className="ad-slot" style={{ height:h, width:w||"100%", minHeight:h }}>
        <ins className="adsbygoogle" style={{ display:"block", width:w||"100%", height:h }}
          data-ad-client={ADS_CLIENT} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// STICKY AD — apparaît uniquement après 300px de scroll
// ═══════════════════════════════════════════════════════
const StickyAd = ({ slot }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 300) { setVisible(true); window.removeEventListener("scroll", onScroll); }
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <div className="ad-sticky">
      <AdUnit slot={slot} h={50}/>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// PAYPAL BUTTON — brand_name Ghostify, pages retour propres
// ═══════════════════════════════════════════════════════
const PayPalButton = ({ planId, planName, onSuccess, onToast }) => {
  const ref  = useRef(null);
  const init = useRef(false);
  const returnUrl = `${window.location.origin}/?payment=success`;
  const cancelUrl = `${window.location.origin}/?payment=cancel`;

  useEffect(() => {
    if (!ref.current || init.current) return;
    const interval = setInterval(() => {
      if (!window.paypal || !ref.current) return;
      clearInterval(interval);
      init.current = true;
      window.paypal.Buttons({
        style:{ layout:"vertical", color:"black", shape:"rect", label:"subscribe" },
        createSubscription: (_, actions) => actions.subscription.create({
          plan_id: planId,
          application_context: {
            brand_name:  "Ghostify",
            return_url:  returnUrl,
            cancel_url:  cancelUrl,
            user_action: "SUBSCRIBE_NOW"
          }
        }),
        onApprove: (data) => { onSuccess(data.subscriptionID); onToast(`✅ Abonnement ${planName} activé !`, "success"); },
        onError:   ()     => onToast("Erreur PayPal. Réessayez.", "error"),
      }).render(ref.current);
    }, 400);
    return () => clearInterval(interval);
  }, [planId]);

  if (FIREBASE_LIVE)
    return <div ref={ref} style={{ marginTop:10 }} />;
  return (
    <button className="btn btn-gold" style={{ width:"100%", marginTop:10 }}
      onClick={() => { onSuccess("DEMO_SUB_"+Date.now()); }}>
      💳 Activer — Démo
    </button>
  );
};

// ═══════════════════════════════════════════════════════
// PAGE PAIEMENT VALIDÉ — branding Ghostify uniquement
// ═══════════════════════════════════════════════════════
const PaymentSuccess = () => (
  <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", flexDirection:"column", gap:18, padding:24 }}>
    <style>{CSS}</style>
    <div className="gf"><Ic n="ghost" s={60} c="var(--ac)"/></div>
    <h1 style={{ fontFamily:"var(--hf)", fontSize:34, fontWeight:400 }}>Paiement validé !</h1>
    <p style={{ color:"var(--t2)", fontSize:15, textAlign:"center", maxWidth:360 }}>
      Votre abonnement Ghostify est maintenant actif. Bienvenue dans la communauté 👻
    </p>
    <div style={{ background:"var(--acl)", border:"1.5px solid var(--acm)", borderRadius:14, padding:"14px 24px", textAlign:"center" }}>
      <div style={{ color:"var(--ac)", fontWeight:700, fontSize:14 }}>✓ Accès immédiat à toutes les fonctionnalités</div>
      <div style={{ color:"var(--t2)", fontSize:13, marginTop:4 }}>Confirmation envoyée par email</div>
    </div>
    <button className="btn btn-ac" onClick={()=>{ window.history.replaceState({},"",window.location.pathname); window.location.reload(); }}>
      Accéder à mon dashboard →
    </button>
  </div>
);

const PaymentCancel = () => (
  <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", flexDirection:"column", gap:16, padding:24 }}>
    <style>{CSS}</style>
    <div><Ic n="ghost" s={52} c="var(--t3)"/></div>
    <h1 style={{ fontFamily:"var(--hf)", fontSize:26, fontWeight:400 }}>Paiement annulé</h1>
    <p style={{ color:"var(--t2)", fontSize:14, textAlign:"center" }}>Vous pouvez réessayer à tout moment depuis votre profil.</p>
    <button className="btn btn-o" onClick={()=>{ window.history.replaceState({},"",window.location.pathname); window.location.reload(); }}>
      ← Retour
    </button>
  </div>
);

// ═══════════════════════════════════════════════════════
// SPARKLINE
// ═══════════════════════════════════════════════════════
const Sparkline = ({ data, color="#2D6A4F", h=40, w=120 }) => {
  if (!data?.length) return null;
  const max  = Math.max(...data, 1);
  const pts  = data.map((v,i) => `${(i/(data.length-1))*w},${h - (v/max)*h}`).join(" ");
  const area = `M0,${h} L${pts.split(" ").map(p=>p).join(" L")} L${w},${h} Z`;
  return (
    <svg width={w} height={h} className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spGrad)"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

// ═══════════════════════════════════════════════════════
// TEMPLATE SELECTOR
// ═══════════════════════════════════════════════════════
const TemplatePicker = ({ plan, selected, onSelect, color, onColor }) => {
  const avail  = TEMPLATES.filter(t => TIERS[t.tier] <= TIERS[plan]);
  const locked = TEMPLATES.filter(t => TIERS[t.tier] >  TIERS[plan]).slice(0,4);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontWeight:600, fontSize:13.5 }}>Template boutique</span>
        <span className="tag tg">{avail.length} disponibles</span>
      </div>
      <div className="tpl-grid">
        {avail.map(t => (
          <div key={t.id} className={`tpl-card ${selected===t.id?"sel":""}`} onClick={()=>onSelect(t.id)} title={t.name}>
            <div className="tpl-body" style={{ background:t.bg }}>
              <div style={{ height:6, background:t.ac, borderRadius:3, width:"62%" }}/>
              <div style={{ height:3, background:t.ac+"99", borderRadius:2, width:"82%" }}/>
              <div style={{ height:3, background:t.ac+"55", borderRadius:2, width:"50%" }}/>
              <div style={{ flex:1, background:t.ac+"18", borderRadius:3, marginTop:3 }}/>
            </div>
            <div className="tpl-label">{t.name}</div>
            {selected===t.id && (
              <div style={{ position:"absolute", top:5, right:5, background:t.ac, borderRadius:"50%", width:14, height:14, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Ic n="check" s={9} c="white"/>
              </div>
            )}
          </div>
        ))}
        {locked.map(t => (
          <div key={t.id} className="tpl-card locked" title={`Plan ${t.tier} requis`}>
            <div className="tpl-body" style={{ background:t.bg, filter:"blur(1px)", alignItems:"center", justifyContent:"center", display:"flex" }}>
              <span style={{fontSize:16}}>🔒</span>
            </div>
            <div className="tpl-label" style={{ background:"var(--b0)", color:"var(--t3)" }}>🔒</div>
          </div>
        ))}
      </div>
      {onColor && (
        <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12.5, color:"var(--t2)" }}>Couleur accent</span>
          <input type="color" value={color||"#2D6A4F"} onChange={e=>onColor(e.target.value)}
            style={{ width:32, height:32, border:"none", borderRadius:7, cursor:"pointer", padding:2 }}/>
          <div style={{ width:32, height:32, borderRadius:7, background:color||"#2D6A4F", border:"1px solid var(--b1)" }}/>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// LOGO GENERATOR
// ═══════════════════════════════════════════════════════
const LogoGen = ({ onToast }) => {
  const [name,    setName]    = useState("");
  const [slogan,  setSlogan]  = useState("");
  const [style,   setStyle]   = useState("minimal");
  const [color,   setColor]   = useState("#2D6A4F");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const styles = [{id:"minimal",l:"Minimal"},{id:"bold",l:"Bold"},{id:"serif",l:"Serif"},{id:"geo",l:"Géo"},{id:"hand",l:"Script"}];
  const generate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await new Promise(r=>setTimeout(r,1500));
    setResult({ initials:name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(), color, name, slogan, style });
    setLoading(false);
    onToast("🎨 Logo généré !");
  };
  return (
    <div className="logo-gen">
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:13 }}>
        <Ic n="brand" s={17} c="var(--adm)"/>
        <span style={{ fontWeight:700, color:"var(--adm)", fontSize:13.5 }}>Générateur Logo & Marque IA</span>
        <span className="tag tpur">IA</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:10 }}>
        <input className="inp inp-sm" placeholder="Nom de marque *" value={name} onChange={e=>setName(e.target.value)}/>
        <input className="inp inp-sm" placeholder="Slogan (optionnel)" value={slogan} onChange={e=>setSlogan(e.target.value)}/>
      </div>
      <div style={{ display:"flex", gap:7, marginBottom:11, flexWrap:"wrap", alignItems:"center" }}>
        {styles.map(s=>(
          <button key={s.id} className={`btn btn-xs ${style===s.id?"btn-ac":"btn-o"}`} onClick={()=>setStyle(s.id)}>{s.l}</button>
        ))}
        <input type="color" value={color} onChange={e=>setColor(e.target.value)}
          style={{ width:30, height:30, border:"none", borderRadius:7, cursor:"pointer", padding:2 }}/>
      </div>
      <button className="btn btn-ac btn-sm" disabled={loading||!name} onClick={generate} style={{ minWidth:150 }}>
        {loading ? <><span className="spin-w"/> Génération...</> : "🎨 Générer"}
      </button>
      {result && (
        <div className="ai" style={{ marginTop:14, display:"flex", alignItems:"center", gap:14 }}>
          <div className="logo-prev" style={{ background:result.color }}>{result.initials}</div>
          <div>
            <div style={{ fontFamily:"var(--hf)", fontSize:19, fontWeight:600 }}>{result.name}</div>
            {result.slogan && <div style={{ color:"var(--t2)", fontSize:12.5 }}>{result.slogan}</div>}
            <div style={{ display:"flex", gap:7, marginTop:8 }}>
              <button className="btn btn-xs btn-o" onClick={()=>onToast("SVG téléchargé !")}>📥 SVG</button>
              <button className="btn btn-xs btn-o" onClick={()=>onToast("PNG téléchargé !")}>📥 PNG</button>
              <button className="btn btn-xs btn-o" onClick={()=>onToast("Utilisé comme icône boutique !")}>✅ Utiliser</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════
export default function Ghostify() {
  // — vérif URL params paiement PayPal
  const urlParams     = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get("payment");
  if (paymentStatus === "success") return <PaymentSuccess/>;
  if (paymentStatus === "cancel")  return <PaymentCancel/>;

  const [cssOk,       setCssOk]       = useState(false);
  const [user,        setUser]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLogin,         setIsLogin]         = useState(true);
  const [emailInp,        setEmailInp]        = useState("");
  const [passInp,         setPassInp]         = useState("");
  const [confirmPass,     setConfirmPass]     = useState("");
  const [nameInp,         setNameInp]         = useState("");
  const [resetEmail,      setResetEmail]      = useState("");
  const [showReset,       setShowReset]       = useState(false);
  const [authErr,         setAuthErr]         = useState("");
  const [authLoading,     setAuthLoading]     = useState(false);
  const [sites,    setSites]    = useState([]);
  const [sales,    setSales]    = useState([]);
  const [usage,    setUsage]    = useState({ photos:0, videos:0 });
  const [tab,      setTab]      = useState("sites");
  const [urlInputs,setUrlInputs]= useState({});
  const [genLoading,setGenLoading]=useState(false);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [allUsers,     setAllUsers]     = useState([]);
  const [promoCodes,   setPromoCodes]   = useState([]);
  const [tickets,      setTickets]      = useState([]);
  const [selTicket,    setSelTicket]    = useState(null);
  const [tReply,       setTReply]       = useState("");
  const [newPromo,     setNewPromo]     = useState({ code:"", discount:10, maxUses:100, expiresAt:"" });
  const [siteModal,    setSiteModal]    = useState(false);
  const [newSiteName,  setNewSiteName]  = useState("");
  const [newTemplate,  setNewTemplate]  = useState("minimal");
  const [newColor,     setNewColor]     = useState("#2D6A4F");
  const [promoInput,   setPromoInput]   = useState("");
  const [chatOpen,  setChatOpen]  = useState(false);
  const [chatMsgs,  setChatMsgs]  = useState([{ from:"bot", text:"👋 Bonjour ! Posez-moi une question sur Ghostify, je réponds immédiatement !" }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading,setChatLoading]=useState(false);
  const lastChat   = useRef(0);
  const saveTimer  = useRef(null);
  const revenueData = useMemo(()=>Array.from({length:12},(_,i)=>Math.floor(Math.random()*80+i*20)),[]);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    setCssOk(true);
    return () => s.remove();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (document.getElementById("pp-sdk")) return;
      const sc = document.createElement("script");
      sc.id  = "pp-sdk";
      sc.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT}&vault=true&intent=subscription`;
      sc.async = true;
      document.body.appendChild(sc);
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // AdSense — lazy, déclenché uniquement après scroll ou clic
    const load = () => {
      if (document.getElementById("ads-sdk")) return;
      const sc = document.createElement("script");
      sc.id = "ads-sdk";
      sc.async = true;
      sc.crossOrigin = "anonymous";
      sc.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`;
      document.head.appendChild(sc);
    };
    window.addEventListener("scroll", load, { once:true, passive:true });
    window.addEventListener("click",  load, { once:true });
    return () => { window.removeEventListener("scroll",load); window.removeEventListener("click",load); };
  }, []);

  const showToast = useCallback((msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3800);
  }, []);

  useEffect(() => {
    if (!FIREBASE_LIVE) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (fu) => {
      if (fu) {
        if (!fu.emailVerified) {
          setUser(null); setLoading(false);
          showToast("Vérifiez votre email avant de vous connecter.", "error");
          await signOut(auth);
          return;
        }
        try {
          const snap = await getDoc(doc(db, "users", fu.uid));
          const d    = snap.exists() ? snap.data() : {};
          // Admin via champ Firestore isAdmin:true — plus sécurisé que comparaison email
          const isAdm = d.isAdmin === true;
          setUser({
            uid: fu.uid, email: fu.email,
            name: fu.displayName || fu.email.split("@")[0],
            plan: d.plan || "FREE",
            referralCode: d.referralCode || fu.uid.slice(-8).toUpperCase(),
          });
          setSites(d.sites  || []);
          setSales(d.sales  || []);
          setUsage(d.usage  || { photos:0, videos:0 });
          setIsAdmin(isAdm);
          if (isAdm) {
            const q   = query(collection(db,"tickets"), orderBy("createdAt","desc"));
            const unT = onSnapshot(q, snap => setTickets(snap.docs.map(d=>({id:d.id,...d.data()}))));
            setLoading(false);
            return () => unT();
          }
        } catch(e) { showToast("Erreur chargement profil","error"); }
      } else {
        setUser(null); setSites([]); setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid || !FIREBASE_LIVE) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await setDoc(doc(db,"users",user.uid), {
          email:user.email, name:user.name, plan:user.plan,
          referralCode:user.referralCode,
          sites, sales, usage, updatedAt:serverTimestamp()
        }, { merge:true });
      } catch(_) {}
    }, 1200);
  }, [sites, sales, usage, user]);

  const plan    = useMemo(() => user?.plan || "FREE", [user]);
  const limits  = useMemo(() => PLANS[plan], [plan]);
  const isUnlim = plan === "UNLIMITED";
  const showAds = limits?.showAds && !isAdmin;
  const hasLogo = ["ULTIMATE","UNLIMITED"].includes(plan);
  const allArts = useMemo(() => sites.flatMap(s => s.articles.map(a=>({...a,siteName:s.name,siteSlug:s.slug}))), [sites]);
  const openTickets = useMemo(() => tickets.filter(t=>t.status==="open").length, [tickets]);
  const photoPct    = isUnlim || !limits?.maxPhotos ? 100 : Math.min(100,(usage.photos/limits.maxPhotos)*100);
  const videoPct    = isUnlim || !limits?.maxVideos ? 100 : Math.min(100,(usage.videos/limits.maxVideos)*100);
  const totalRev    = useMemo(() => sales.reduce((s,v)=>s+(v.amount||0),0), [sales]);

  const handleSignUp = async (e) => {
    e.preventDefault(); setAuthErr(""); setAuthLoading(true);
    if (passInp !== confirmPass) { setAuthErr("Les mots de passe ne correspondent pas"); setAuthLoading(false); return; }
    if (passInp.length < 6)      { setAuthErr("Mot de passe trop court (min. 6 caractères)"); setAuthLoading(false); return; }
    const em = emailInp.trim().toLowerCase();
    try {
      const cred = await createUserWithEmailAndPassword(auth, em, passInp);
      await updateProfile(cred.user, { displayName: nameInp || em.split("@")[0] });
      await sendEmailVerification(cred.user);
      const refCode = cred.user.uid.slice(-8).toUpperCase();
      await setDoc(doc(db,"users",cred.user.uid), {
        email:em, name:nameInp||em.split("@")[0], plan:"FREE",
        sites:[], sales:[], usage:{photos:0,videos:0},
        referralCode:refCode, isAdmin:false, createdAt:serverTimestamp()
      });
      showToast("Compte créé ! Vérifiez votre email avant de vous connecter.");
      setEmailInp(""); setPassInp(""); setConfirmPass(""); setNameInp("");
    } catch(err) {
      if (err.code==="auth/email-already-in-use") setAuthErr("Email déjà utilisé");
      else setAuthErr("Erreur lors de l'inscription. Réessayez.");
    }
    setAuthLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthErr(""); setAuthLoading(true);
    if (!FIREBASE_LIVE) {
      setUser({ ...DEMO_USER, email:emailInp||DEMO_USER.email, name:(emailInp||"demo").split("@")[0] });
      setSites(DEMO_SITES);
      setLoading(false); setAuthLoading(false);
      showToast("Connexion démo !");
      return;
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, emailInp.trim(), passInp);
      if (!cred.user.emailVerified) {
        setAuthErr("Vérifiez votre email avant de vous connecter.");
        await signOut(auth); setAuthLoading(false); return;
      }
      setEmailInp(""); setPassInp("");
    } catch(_) { setAuthErr("Email ou mot de passe incorrect"); }
    setAuthLoading(false);
  };

  const handleAdminDemo = () => {
    setUser({ uid:"admin_uid", email:"admin@ghostify.fr", name:"Admin", plan:"UNLIMITED", referralCode:"ADMIN001" });
    setIsAdmin(true); setLoading(false);
    setTickets([
      { id:"tkt001", subject:"Problème paiement PayPal", message:"Mon abonnement ne s'active pas après le paiement.", userEmail:"alice@exemple.fr", userName:"Alice", status:"open", adminReplies:[], createdAt:{seconds:Date.now()/1000} },
      { id:"tkt002", subject:"Limite de vidéos atteinte", message:"J'ai utilisé mes 5 vidéos Pro mais j'en ai besoin de plus.", userEmail:"bob@exemple.fr", userName:"Bob", status:"open", adminReplies:[{message:"Nous avons crédité 5 vidéos supplémentaires.",date:"2025-05-10"}], createdAt:{seconds:Date.now()/1000} },
      { id:"tkt003", subject:"Template Aurora introuvable", message:"Je ne vois pas le template Aurora dans Ultimate.", userEmail:"clara@exemple.fr", userName:"Clara", status:"resolved", adminReplies:[], createdAt:{seconds:Date.now()/1000} },
    ]);
    setPromoCodes([
      { id:"GHOST20",  code:"GHOST20",  discount:20, maxUses:100, usedCount:43 },
      { id:"LAUNCH50", code:"LAUNCH50", discount:50, maxUses:50,  usedCount:50 },
    ]);
    setAllUsers([
      { uid:"u1", email:"alice@exemple.fr", name:"Alice", plan:"PRO",      sites:[{},{},{}]    },
      { uid:"u2", email:"bob@exemple.fr",   name:"Bob",   plan:"FREE",     sites:[{}]          },
      { uid:"u3", email:"clara@exemple.fr", name:"Clara", plan:"ULTIMATE", sites:[{},{},{},{}] },
      { uid:"u4", email:"david@exemple.fr", name:"David", plan:"UNLIMITED",sites:[{},{},{}]    },
    ]);
    showToast("Mode Admin activé (démo)");
  };

  const handleLogout = async () => {
    if (FIREBASE_LIVE) await signOut(auth);
    setUser(null); setSites([]); setIsAdmin(false); setTab("sites");
    showToast("Déconnecté");
  };

  const handleResetPassword = async () => {
    const em = resetEmail || user?.email;
    if (!em) return;
    try {
      if (FIREBASE_LIVE) await sendPasswordResetEmail(auth, em);
      showToast("Email de réinitialisation envoyé !"); setShowReset(false); setResetEmail("");
    } catch(_) { showToast("Aucun compte avec cet email","error"); }
  };

  const upgradePlan = async (planKey, subId) => {
    if (!user) return;
    if (FIREBASE_LIVE) await setDoc(doc(db,"users",user.uid),{ plan:planKey, paypalSubscriptionId:subId },{ merge:true });
    setUser(p=>({...p,plan:planKey}));
    showToast(`🎉 Plan ${PLANS[planKey].label} activé !`);
  };

  const applyPromoCode = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (FIREBASE_LIVE) {
      try {
        const ref  = doc(db,"promoCodes",code);
        const snap = await getDoc(ref);
        if (!snap.exists()) { showToast("Code invalide","error"); return; }
        const d = snap.data();
        if (d.usedCount >= d.maxUses) { showToast("Code épuisé","error"); return; }
        await updateDoc(ref, { usedCount: increment(1) });
        showToast(`✅ Code ${code} appliqué — ${d.discount}% de réduction !`);
        setPromoInput(""); return;
      } catch(_) { showToast("Erreur vérification code","error"); return; }
    }
    showToast("Codes promo disponibles en production","error");
  };

  const handleAddSite = () => {
    if (!newSiteName.trim()) return;
    if (!isUnlim && sites.length >= limits.maxSites) { showToast(`Limite ${limits.maxSites} boutique(s) atteinte`,"error"); return; }
    const slug = newSiteName.toLowerCase().replace(/\s+/g,"-")+"-"+Date.now();
    setSites(p=>[...p,{ slug, name:newSiteName, template:newTemplate, color:newColor, articles:[], stats:{views:0,orders:0} }]);
    setSiteModal(false); setNewSiteName(""); showToast(`Boutique "${newSiteName}" créée !`);
  };

  const handleDelSite = (slug) => {
    if (!window.confirm("Supprimer cette boutique ?")) return;
    setSites(p=>p.filter(s=>s.slug!==slug)); showToast("Boutique supprimée");
  };

  const handleAddArticle = (slug) => {
    const url = (urlInputs[slug]||"").trim();
    if (!url) return;
    const parsed = parseProductURL(url);
    if (!parsed) { showToast("URL invalide","error"); return; }
    const site = sites.find(s=>s.slug===slug);
    if (!site) return;
    if (!isUnlim && site.articles.length >= limits.maxArt) { showToast(`Max ${limits.maxArt} article(s) par site`,"error"); return; }
    setSites(p=>p.map(s=>s.slug!==slug?s:{...s, articles:[...s.articles,{
      id:Date.now(), name:`Produit ${s.articles.length+1}`,
      url, platform:parsed.platform, icon:parsed.icon,
      media:{photos:[],videos:[]}, stats:{views:0,orders:0}
    }]}));
    setUrlInputs(p=>({...p,[slug]:""})); showToast(`Article ajouté (${parsed.platform}) !`);
  };

  const handleGenMedia = useCallback(async (art, type) => {
    if (genLoading) return;
    if (type==="videos" && plan==="FREE") { showToast("Vidéos disponibles dès le plan Pro","error"); return; }
    setGenLoading(true);
    await new Promise(r=>setTimeout(r,2000));
    const photos = type==="photos" ? Array.from({length:5},(_,i)=>`https://picsum.photos/seed/${art.id+i}/400/400`) : [];
    const videos = type==="videos" ? Array.from({length:isUnlim?5:plan==="ULTIMATE"?3:1},()=>"mock_video") : [];
    setUsage(p=>({ photos:p.photos+photos.length, videos:p.videos+videos.length }));
    setSites(p=>p.map(s=>({...s,articles:s.articles.map(a=>a.id!==art.id?a:{...a,media:{photos:[...a.media.photos,...photos],videos:[...a.media.videos,...videos]}})})));
    setGenLoading(false);
    showToast(`${photos.length||videos.length} ${type==="photos"?"photos":"vidéos"} générés !`);
  }, [genLoading, plan, isUnlim]);

  const loadAllUsers = async () => {
    if (!FIREBASE_LIVE) return;
    const snap = await getDocs(collection(db,"users"));
    setAllUsers(snap.docs.map(d=>({uid:d.id,...d.data()})));
  };
  const loadPromos = async () => {
    if (!FIREBASE_LIVE) return;
    const snap = await getDocs(collection(db,"promoCodes"));
    setPromoCodes(snap.docs.map(d=>({id:d.id,...d.data()})));
  };
  const adminCreatePromo = async () => {
    if (!newPromo.code.trim()) return;
    const code = newPromo.code.toUpperCase();
    const obj  = { code, discount:Math.min(50,Math.max(5,newPromo.discount)), maxUses:newPromo.maxUses||100, usedCount:0, expiresAt:newPromo.expiresAt||null, createdAt:serverTimestamp() };
    if (FIREBASE_LIVE) await setDoc(doc(db,"promoCodes",code),obj);
    else setPromoCodes(p=>[...p,{...obj,id:code}]);
    setNewPromo({code:"",discount:10,maxUses:100,expiresAt:""});
    showToast(`Code ${code} créé !`);
  };
  const adminDelPromo = async (id) => {
    if (FIREBASE_LIVE) await deleteDoc(doc(db,"promoCodes",id));
    else setPromoCodes(p=>p.filter(x=>x.id!==id));
    showToast("Code supprimé");
  };
  const adminReply = async (tId, msg) => {
    if (!msg.trim()) return;
    const reply = { message:msg, date:new Date().toISOString() };
    if (FIREBASE_LIVE) {
      const ref  = doc(db,"tickets",tId);
      const snap = await getDoc(ref);
      await updateDoc(ref,{ adminReplies:[...(snap.data().adminReplies||[]),reply], status:"open" });
    } else {
      setTickets(p=>p.map(t=>t.id!==tId?t:{...t,adminReplies:[...t.adminReplies,reply]}));
    }
    setTReply(""); showToast("Réponse envoyée !");
  };
  const adminResolve = async (tId) => {
    if (FIREBASE_LIVE) await updateDoc(doc(db,"tickets",tId),{ status:"resolved", resolvedAt:serverTimestamp() });
    else setTickets(p=>p.map(t=>t.id!==tId?t:{...t,status:"resolved"}));
    setSelTicket(p=>p?.id===tId?{...p,status:"resolved"}:p);
    showToast("Ticket résolu !");
  };

  const handleChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    if (Date.now()-lastChat.current < 2500) { showToast("Attendez avant d'envoyer","error"); return; }
    lastChat.current = Date.now();
    setChatInput(""); setChatLoading(true);
    setChatMsgs(p=>[...p,{from:"user",text:msg}]);
    await new Promise(r=>setTimeout(r,700));
    const auto = autoReply(msg);
    if (auto) {
      setChatMsgs(p=>[...p,{from:"bot",text:auto}]);
    } else {
      if (user && FIREBASE_LIVE) {
        try {
          await addDoc(collection(db,"tickets"),{
            userId:user.uid, userEmail:user.email, userName:user.name,
            subject:"Assistance chatbot", message:msg, status:"open",
            createdAt:serverTimestamp(), adminReplies:[]
          });
        } catch(_) {}
      }
      setChatMsgs(p=>[...p,{from:"bot",text:`✅ Ticket créé ! Notre équipe répondra sous 24h à ${SUPPORT_EMAIL}`}]);
    }
    setChatLoading(false);
  }, [chatInput, chatLoading, user]);

  if (!cssOk) return null;
  if (loading) return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"var(--bg)"}}>
      <div className="spin"/>
    </div>
  );

  // ════════════════════════════════════════════════════
  // AUTH
  // ════════════════════════════════════════════════════
  if (!user) return (
    <div className="auth-wrap">
      {toast && <div className={`toast t-${toast.type}`}>{toast.msg}</div>}
      <div className="card au" style={{maxWidth:430,width:"100%",padding:30}}>
        <div style={{textAlign:"center",marginBottom:26}}>
          <div className="gf"><Ic n="ghost" s={50} c="var(--ac)"/></div>
          <h1 style={{fontFamily:"var(--hf)",fontSize:30,fontWeight:400,marginTop:8}}>Ghostify</h1>
          <p style={{color:"var(--t2)",fontSize:13.5}}>Dropshipping propulsé par l'IA</p>
        </div>
        <div style={{display:"flex",gap:0,marginBottom:22,borderBottom:"2px solid var(--b0)"}}>
          <button className={`tab-btn ${isLogin?"active":""}`} onClick={()=>{setIsLogin(true);setAuthErr("");}}>Connexion</button>
          <button className={`tab-btn ${!isLogin?"active":""}`} onClick={()=>{setIsLogin(false);setAuthErr("");}}>Inscription</button>
        </div>
        {authErr && <div style={{background:"var(--dangerl)",color:"var(--danger)",borderRadius:9,padding:"10px 14px",fontSize:13,marginBottom:12}}>{authErr}</div>}
        {isLogin ? (
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:12}}><input className="inp" type="email" placeholder="Email" value={emailInp} onChange={e=>setEmailInp(e.target.value)} required/></div>
            <div style={{marginBottom:12}}><input className="inp" type="password" placeholder="Mot de passe" value={passInp} onChange={e=>setPassInp(e.target.value)} required/></div>
            <button type="button" className="btn btn-o btn-sm" style={{width:"100%",marginBottom:12}} onClick={()=>setShowReset(true)}>Mot de passe oublié ?</button>
            <button type="submit" className="btn btn-p" style={{width:"100%"}} disabled={authLoading}>
              {authLoading?<span className="spin-w"/>:"Se connecter"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp}>
            <div style={{marginBottom:11}}><input className="inp" type="text" placeholder="Nom / Pseudo" value={nameInp} onChange={e=>setNameInp(e.target.value)}/></div>
            <div style={{marginBottom:11}}><input className="inp" type="email" placeholder="Email" value={emailInp} onChange={e=>setEmailInp(e.target.value)} required/></div>
            <div style={{marginBottom:11}}><input className="inp" type="password" placeholder="Mot de passe (min. 6 car.)" value={passInp} onChange={e=>setPassInp(e.target.value)} required/></div>
            <div style={{marginBottom:11}}><input className="inp" type="password" placeholder="Confirmer le mot de passe" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} required/></div>
            <button type="submit" className="btn btn-p" style={{width:"100%"}} disabled={authLoading}>
              {authLoading?<span className="spin-w"/>:"Créer mon compte"}
            </button>
          </form>
        )}
        {!FIREBASE_LIVE && (
          <button className="btn btn-o btn-sm" style={{width:"100%",marginTop:10}} onClick={handleAdminDemo}>
            🔐 Accès Admin (démo)
          </button>
        )}
        <p style={{textAlign:"center",fontSize:11.5,color:"var(--t3)",marginTop:16}}>Support : {SUPPORT_EMAIL}</p>
      </div>
      {showReset && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowReset(false)}>
          <div className="card" style={{maxWidth:360,width:"90%",padding:24}}>
            <h3 style={{marginBottom:12,fontFamily:"var(--hf)",fontWeight:400}}>Réinitialiser le mot de passe</h3>
            <input className="inp" type="email" placeholder="Votre email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} style={{marginBottom:14}}/>
            <div style={{display:"flex",gap:9}}>
              <button className="btn btn-p" style={{flex:1}} onClick={handleResetPassword}>Envoyer</button>
              <button className="btn btn-o" style={{flex:1}} onClick={()=>{setShowReset(false);setResetEmail("");}}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════
  // ADMIN
  // ════════════════════════════════════════════════════
  if (isAdmin) return (
    <div style={{display:"flex",minHeight:"100vh",background:"var(--bg)"}}>
      {toast && <div className={`toast t-${toast.type}`}>{toast.msg}</div>}
      <aside style={{width:215,background:"var(--w)",borderRight:"1px solid var(--b0)",padding:"20px 13px",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:20}}>
          <Ic n="ghost" s={24} c="var(--adm)"/>
          <span style={{fontFamily:"var(--hf)",fontWeight:600,fontSize:17}}>Admin</span>
        </div>
        {[
          {id:"dashboard",l:"Dashboard",i:"chart"},
          {id:"users",    l:"Utilisateurs",i:"users"},
          {id:"tickets",  l:"Tickets",i:"ticket",badge:openTickets},
          {id:"promos",   l:"Codes Promo",i:"coupon"},
        ].map(({id,l,i,badge})=>(
          <button key={id} className={`dnav ${tab===id?"active":""}`}
            onClick={()=>{ setTab(id); if(id==="users"&&FIREBASE_LIVE)loadAllUsers(); if(id==="promos"&&FIREBASE_LIVE)loadPromos(); }}>
            <Ic n={i} s={14} c={tab===id?"var(--ac)":"var(--t3)"}/>{l}
            {badge>0 && <span className="badge">{badge}</span>}
          </button>
        ))}
        <button className="btn btn-o btn-sm" style={{marginTop:"auto"}} onClick={handleLogout}>Déconnexion</button>
      </aside>
      <main style={{flex:1,padding:28,overflowY:"auto"}}>
        {tab==="dashboard" && (
          <div className="au">
            <h2 style={{fontFamily:"var(--hf)",fontSize:26,fontWeight:400,marginBottom:20}}>Dashboard Admin</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:28}}>
              {[
                {l:"Utilisateurs",v:allUsers.length,i:"users",c:"var(--ac)"},
                {l:"Tickets ouverts",v:openTickets,i:"ticket",c:"#E05A2B"},
                {l:"Codes actifs",v:promoCodes.length,i:"coupon",c:"var(--gold)"},
                {l:"Revenue total",v:"—",i:"bar",c:"var(--adm)"},
              ].map(({l,v,i,c})=>(
                <div key={l} className="card" style={{padding:18}}>
                  <Ic n={i} s={20} c={c}/>
                  <div style={{fontSize:36,fontWeight:700,fontFamily:"var(--hf)",marginTop:6,color:c}}>{v}</div>
                  <div style={{color:"var(--t2)",fontSize:13}}>{l}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{padding:20}}>
              <div style={{fontWeight:600,marginBottom:12,fontSize:14}}>Plans distribution</div>
              {Object.entries(PLANS).map(([k,p])=>{
                const count = allUsers.filter(u=>u.plan===k).length;
                const pct   = allUsers.length ? (count/allUsers.length)*100 : 0;
                return (
                  <div key={k} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}>
                      <span>{p.label}</span><span style={{color:"var(--t2)"}}>{count} utilisateurs</span>
                    </div>
                    <div className="prog"><div className="prog-f" style={{width:`${pct}%`}}/></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {tab==="users" && (
          <div className="au">
            <h2 style={{fontFamily:"var(--hf)",fontSize:24,fontWeight:400,marginBottom:18}}>Utilisateurs ({allUsers.length})</h2>
            <div className="card" style={{padding:18,overflowX:"auto"}}>
              {FIREBASE_LIVE && <button className="btn btn-ac btn-sm" onClick={loadAllUsers} style={{marginBottom:13}}>Rafraîchir</button>}
              <table className="atbl">
                <thead><tr><th>Email</th><th>Nom</th><th>Plan</th><th>Sites</th><th>Inscrit</th></tr></thead>
                <tbody>
                  {allUsers.map(u=>(
                    <tr key={u.uid}>
                      <td style={{fontSize:12.5}}>{u.email}</td>
                      <td style={{fontWeight:500}}>{u.name}</td>
                      <td><span className={`tag ${u.plan==="UNLIMITED"?"tgold":u.plan==="FREE"?"tgray":"tg"}`}>{u.plan}</span></td>
                      <td style={{color:"var(--t2)"}}>{u.sites?.length||0}</td>
                      <td style={{color:"var(--t3)",fontSize:12}}>{u.createdAt?.seconds ? new Date(u.createdAt.seconds*1000).toLocaleDateString("fr"):"-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab==="tickets" && (
          <div className="au">
            <h2 style={{fontFamily:"var(--hf)",fontSize:24,fontWeight:400,marginBottom:18}}>Tickets support <span style={{fontSize:16,color:"var(--t2)"}}>({tickets.filter(t=>t.status==="open").length} ouverts)</span></h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
              <div style={{maxHeight:560,overflowY:"auto"}}>
                {tickets.length===0 && <div className="empty"><p>Aucun ticket</p></div>}
                {tickets.map(t=>(
                  <div key={t.id} className={`tkt ${selTicket?.id===t.id?"sel":""}`} onClick={()=>setSelTicket(t)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <strong style={{fontSize:12.5}}>#{t.id.slice(-6)} — {t.subject}</strong>
                      <span className={`tag ${t.status==="open"?"tg":"tgray"}`}>{t.status}</span>
                    </div>
                    <div style={{fontSize:11.5,color:"var(--t2)",marginTop:3}}>{t.userEmail}</div>
                  </div>
                ))}
              </div>
              {selTicket && (
                <div className="card as" style={{padding:18}}>
                  <div style={{fontWeight:600,marginBottom:11}}>{selTicket.subject}</div>
                  <div style={{background:"var(--s1)",padding:12,borderRadius:10,fontSize:13,marginBottom:12}}>{selTicket.message}</div>
                  {selTicket.adminReplies?.map((r,i)=>(
                    <div key={i} style={{background:"var(--acl)",padding:10,borderRadius:10,fontSize:12.5,marginBottom:7}}>
                      <strong>Support :</strong> {r.message}
                    </div>
                  ))}
                  {selTicket.status==="open" ? (
                    <>
                      <textarea className="inp" rows={3} placeholder="Votre réponse..." value={tReply} onChange={e=>setTReply(e.target.value)} style={{marginBottom:9,fontSize:13}}/>
                      <div style={{display:"flex",gap:8}}>
                        <button className="btn btn-ac btn-sm" onClick={()=>adminReply(selTicket.id,tReply)}>Répondre</button>
                        <button className="btn btn-p btn-sm" onClick={()=>adminResolve(selTicket.id)}>Résoudre</button>
                      </div>
                    </>
                  ) : (
                    <div className="tag tgray">✅ Résolu</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {tab==="promos" && (
          <div className="au">
            <h2 style={{fontFamily:"var(--hf)",fontSize:24,fontWeight:400,marginBottom:18}}>Codes Promo</h2>
            <div className="card" style={{padding:20,marginBottom:18}}>
              <div style={{fontWeight:600,marginBottom:12}}>Créer un code</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:9,marginBottom:10}}>
                <input className="inp inp-sm" placeholder="Code *" value={newPromo.code} onChange={e=>setNewPromo(p=>({...p,code:e.target.value.toUpperCase()}))}/>
                <input className="inp inp-sm" type="number" placeholder="Réduction %" value={newPromo.discount} onChange={e=>setNewPromo(p=>({...p,discount:parseInt(e.target.value)||10}))}/>
                <input className="inp inp-sm" type="number" placeholder="Max utilisations" value={newPromo.maxUses} onChange={e=>setNewPromo(p=>({...p,maxUses:parseInt(e.target.value)||100}))}/>
                <input className="inp inp-sm" type="date" value={newPromo.expiresAt} onChange={e=>setNewPromo(p=>({...p,expiresAt:e.target.value}))}/>
              </div>
              <button className="btn btn-ac btn-sm" disabled={!newPromo.code} onClick={adminCreatePromo}>Créer le code</button>
            </div>
            {promoCodes.map(p=>(
              <div key={p.id} style={{background:"var(--goldl)",border:"1.5px solid var(--gold)",borderRadius:12,padding:13,marginBottom:9,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <strong style={{fontSize:15}}>{p.code}</strong>
                  <span style={{color:"var(--t2)",fontSize:13,marginLeft:9}}>{p.discount}% · {p.usedCount||0}/{p.maxUses} utilisations</span>
                </div>
                <button className="btn btn-d btn-xs" onClick={()=>adminDelPromo(p.id)}>Supprimer</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );

  // ════════════════════════════════════════════════════
  // USER DASHBOARD
  // ════════════════════════════════════════════════════
  const isNewUser = sites.length===0 && totalRev===0;

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"var(--bg)"}}>
      {toast && <div className={`toast t-${toast.type}`}>{toast.msg}</div>}

      <button className="chat-btn" onClick={()=>setChatOpen(v=>!v)}>
        <Ic n="chat" s={16} c="white"/> Assistant
      </button>
      {chatOpen && (
        <div className="chat-panel">
          <div style={{padding:"11px 15px",background:"var(--ac)",color:"white",fontWeight:600,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:14}}>
            <span>✨ Assistant Ghostify</span>
            <button onClick={()=>setChatOpen(false)} style={{background:"none",border:"none",color:"white",fontSize:19,cursor:"pointer",lineHeight:1}}>×</button>
          </div>
          <div style={{maxHeight:240,overflowY:"auto",padding:11,display:"flex",flexDirection:"column",gap:7}}>
            {chatMsgs.map((m,i)=>(
              <div key={i} style={{alignSelf:m.from==="bot"?"flex-start":"flex-end",background:m.from==="bot"?"var(--s1)":"var(--acl)",padding:"7px 12px",borderRadius:13,maxWidth:"84%",fontSize:13,lineHeight:1.5}}>{m.text}</div>
            ))}
            {chatLoading && <div style={{alignSelf:"flex-start",background:"var(--s1)",padding:"8px 13px",borderRadius:13}}><span className="spin" style={{width:13,height:13,borderWidth:2}}/></div>}
          </div>
          <div style={{padding:"7px 9px",borderTop:"1px solid var(--b0)",display:"flex",gap:7,background:"var(--w)"}}>
            <input className="inp inp-sm" style={{flex:1}} placeholder="Posez une question..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyPress={e=>e.key==="Enter"&&handleChat()}/>
            <button className="btn btn-ac btn-sm" onClick={handleChat} disabled={chatLoading}>→</button>
          </div>
          <div style={{padding:"6px 12px",background:"var(--s1)",borderTop:"1px solid var(--b0)"}}>
            <div style={{fontSize:10.5,color:"var(--t3)",textAlign:"center"}}>Plans · Vidéos · Templates · Logo · Parrainage · PayPal</div>
          </div>
        </div>
      )}

      {sidebarOpen && <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:699}} onClick={()=>setSidebarOpen(false)}/>}

      <aside className={`sidebar ${sidebarOpen?"open":""}`} style={{width:225,background:"var(--w)",borderRight:"1px solid var(--b0)",padding:"20px 13px",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:20}}>
          <Ic n="ghost" s={26} c="var(--ac)"/>
          <span style={{fontFamily:"var(--hf)",fontWeight:600,fontSize:20}}>Ghostify</span>
          {/* Badge démo discret — remplace la barre bleue plein écran */}
          {!FIREBASE_LIVE && <span className="demo-badge">démo</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",background:"var(--s1)",borderRadius:11,marginBottom:16}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"var(--acl)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"var(--ac)",fontSize:13,flexShrink:0}}>
            {(user.name||"?")[0].toUpperCase()}
          </div>
          <div style={{overflow:"hidden"}}>
            <div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:130}}>{user.name}</div>
            <span className={`tag ${plan==="UNLIMITED"?"tgold":plan==="FREE"?"tgray":"tg"}`} style={{fontSize:10,padding:"1px 8px"}}>{plan}</span>
          </div>
        </div>
        {!FIREBASE_LIVE && (
          <div style={{marginBottom:13,padding:"8px 10px",background:"var(--s1)",borderRadius:10,border:"1px dashed var(--b1)"}}>
            <div style={{fontSize:10,color:"var(--t2)",marginBottom:5,fontWeight:600,letterSpacing:".05em"}}>PLAN DÉMO</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {Object.keys(PLANS).map(p=>(
                <button key={p} onClick={()=>setUser(u=>({...u,plan:p}))}
                  style={{border:"none",borderRadius:5,padding:"2px 7px",fontSize:11,cursor:"pointer",fontWeight:600,
                  background:plan===p?"var(--ac)":"var(--b0)",color:plan===p?"white":"var(--t2)"}}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {[
          {id:"sites",  l:"Boutiques",i:"shop"},
          {id:"media",  l:"Médias IA", i:"image"},
          {id:"profile",l:"Profil",    i:"cog"},
        ].map(({id,l,i})=>(
          <button key={id} className={`dnav ${tab===id?"active":""}`} onClick={()=>{setTab(id);setSidebarOpen(false);}}>
            <Ic n={i} s={14} c={tab===id?"var(--ac)":"var(--t3)"}/>{l}
          </button>
        ))}
        {!isUnlim && plan!=="FREE" && (
          <div style={{marginTop:13,padding:"9px 11px",background:"var(--s1)",borderRadius:10}}>
            <div style={{fontSize:11,color:"var(--t2)",marginBottom:2}}>Photos {usage.photos}/{limits.maxPhotos}</div>
            <div className="prog"><div className="prog-f" style={{width:`${photoPct}%`,background:photoPct>85?"#E05A2B":"var(--ac)"}}/></div>
            <div style={{fontSize:11,color:"var(--t2)",marginTop:7,marginBottom:2}}>Vidéos {usage.videos}/{limits.maxVideos}</div>
            <div className="prog"><div className="prog-f" style={{width:`${videoPct}%`}}/></div>
          </div>
        )}
        {isUnlim && (
          <div style={{marginTop:10,padding:"8px 11px",background:"var(--acl)",borderRadius:10,fontSize:11.5,color:"var(--ac)",fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
            <Ic n="zap" s={13} c="var(--ac)"/> Générations illimitées
          </div>
        )}
        {/* Pub sidebar supprimée — trop intrusive */}
        {plan!=="UNLIMITED" && (
          <div className="upg-cta" onClick={()=>setTab("profile")}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <Ic n="star" s={13} c="var(--gold)"/>
              <span style={{fontSize:12.5,fontWeight:700,color:"var(--t1)"}}>Passer Illimité</span>
            </div>
            <div style={{fontSize:11.5,color:"var(--t2)",marginTop:2}}>39,99€/mois · Zéro pub · 50 templates</div>
          </div>
        )}
        <div style={{marginTop:"auto",paddingTop:14,borderTop:"1px solid var(--b0)"}}>
          <div style={{fontSize:11,color:"var(--t3)",marginBottom:8}}>Boutiques : {sites.length}/{isUnlim?"∞":limits.maxSites}</div>
          <button className="btn btn-o btn-sm" style={{width:"100%"}} onClick={handleLogout}>Déconnexion</button>
        </div>
      </aside>

      <main className="main" style={{flex:1,padding:26,overflowY:"auto",minWidth:0}}>
        <div className="mobile-only" style={{alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <button className="btn btn-o btn-sm" onClick={()=>setSidebarOpen(true)}><Ic n="menu" s={16}/></button>
          <span style={{fontFamily:"var(--hf)",fontWeight:600,fontSize:18}}>Ghostify</span>
          <span className={`tag ${plan==="UNLIMITED"?"tgold":"tg"}`}>{plan}</span>
        </div>

        {tab==="sites" && (
          <div className="au">
            {isNewUser && (
              <div className="onboard">
                <div style={{fontWeight:700,fontSize:15,marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                  <Ic n="zap" s={16} c="var(--ac)"/> Bienvenue sur Ghostify ! 3 étapes pour démarrer
                </div>
                {[
                  { done:sites.length>0,     txt:"Créer votre première boutique" },
                  { done:allArts.length>0,   txt:"Ajouter un produit (AliExpress/CJ/Zendrop)" },
                  { done:usage.photos>0||usage.videos>0, txt:"Générer vos premiers visuels IA" },
                ].map((s,i)=>(
                  <div key={i} className="onboard-step">
                    <div className={`dot ${s.done?"dot-done":"dot-todo"}`}>{s.done?<Ic n="check" s={10} c="white"/>:i+1}</div>
                    <span style={{color:s.done?"var(--t3)":"var(--t1)",textDecoration:s.done?"line-through":"none",fontSize:13.5}}>{s.txt}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <h2 style={{fontFamily:"var(--hf)",fontSize:27,fontWeight:400}}>Mes boutiques</h2>
              <button className="btn btn-ac" onClick={()=>setSiteModal(true)}>
                <Ic n="plus" s={15} c="white"/> Nouvelle boutique
              </button>
            </div>
            {sites.length===0 && (
              <div className="empty">
                <div className="gf"><Ic n="ghost" s={52} c="var(--t3)"/></div>
                <p style={{fontSize:15}}>Créez votre première boutique</p>
                <p style={{fontSize:13,color:"var(--t3)"}}>Templates pro · Génération IA · CJ & AliExpress</p>
                <button className="btn btn-ac" onClick={()=>setSiteModal(true)}><Ic n="plus" s={15} c="white"/> Créer une boutique</button>
              </div>
            )}
            {sites.map((site, sIdx)=>(
              <div key={site.slug}>
                <div className="card card-h" style={{marginBottom:13,padding:19}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:11}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <div style={{width:11,height:11,borderRadius:"50%",background:site.color||"var(--ac)"}}/>
                        <h3 style={{fontFamily:"var(--hf)",fontWeight:400,fontSize:19}}>{site.name}</h3>
                      </div>
                      <div style={{fontSize:12,color:"var(--t2)",marginTop:2}}>
                        {TEMPLATES.find(t=>t.id===site.template)?.name||"Minimal"} · {site.articles.length} article(s)
                      </div>
                    </div>
                    <div style={{display:"flex",gap:7}}>
                      <button className="btn btn-o btn-sm" onClick={()=>showToast("Lien boutique copié !")}>
                        <Ic n="share" s={12}/><span className="hide-mob">Partager</span>
                      </button>
                      <button className="btn btn-d btn-sm" onClick={()=>handleDelSite(site.slug)}><Ic n="trash" s={13}/></button>
                    </div>
                  </div>
                  {(site.stats?.views>0||site.articles.length>0) && (
                    <div style={{display:"flex",gap:12,marginBottom:11,flexWrap:"wrap"}}>
                      <div className="stat-card"><div style={{fontSize:11,color:"var(--t2)"}}>Vues</div><div style={{fontWeight:700,fontSize:15}}>{site.stats?.views||0}</div></div>
                      <div className="stat-card"><div style={{fontSize:11,color:"var(--t2)"}}>Commandes</div><div style={{fontWeight:700,fontSize:15}}>{site.stats?.orders||0}</div></div>
                      <div className="stat-card"><div style={{fontSize:11,color:"var(--t2)"}}>Conv.</div><div style={{fontWeight:700,fontSize:15}}>{site.stats?.orders&&site.stats?.views?(((site.stats.orders/site.stats.views)*100).toFixed(1)+"%"):"—"}</div></div>
                    </div>
                  )}
                  <div style={{display:"flex",gap:9}}>
                    <input className="inp inp-sm" style={{flex:1}}
                      placeholder="URL AliExpress / CJDropshipping / Zendrop / Temu..."
                      value={urlInputs[site.slug]||""}
                      onChange={e=>setUrlInputs(p=>({...p,[site.slug]:e.target.value}))}
                      onKeyPress={e=>e.key==="Enter"&&handleAddArticle(site.slug)}/>
                    <button className="btn btn-p btn-sm" onClick={()=>handleAddArticle(site.slug)}>Ajouter</button>
                  </div>
                  {site.articles.map(art=>(
                    <div key={art.id} style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--b0)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                      <div>
                        <span style={{fontSize:13,fontWeight:500}}>{art.icon} {art.name}</span>
                        <span className="tag tgray" style={{marginLeft:8,fontSize:11}}>{art.platform}</span>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn btn-sm btn-ac" disabled={genLoading} onClick={()=>handleGenMedia(art,"photos")}>
                          {genLoading?<span className="spin-w"/>:"📷"} Photos
                        </button>
                        {plan!=="FREE" && (
                          <button className={`btn btn-sm ${isUnlim?"btn-gold":"btn-p"}`} disabled={genLoading} onClick={()=>handleGenMedia(art,"videos")}>
                            🎬 {isUnlim?"Vidéos":"Vidéo"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {/* 1 seule pub InFeed, entre boutique 1 et 2 uniquement */}
                {showAds && sIdx === 0 && sites.length > 1 && (
                  <div style={{marginBottom:13}}>
                    <AdUnit slot={AD_SLOTS.INFEED} h={88}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab==="media" && (
          <div className="au">
            <h2 style={{fontFamily:"var(--hf)",fontSize:27,fontWeight:400,marginBottom:18}}>Médias IA</h2>
            {isUnlim && (
              <div style={{display:"flex",alignItems:"center",gap:9,padding:13,background:"var(--goldl)",border:"1.5px solid var(--gold)",borderRadius:13,marginBottom:18}}>
                <Ic n="zap" s={18} c="var(--gold)"/>
                <span style={{fontWeight:600}}>Générations illimitées — photos & vidéos</span>
              </div>
            )}
            {/* Pub flottante droite supprimée */}
            {allArts.length===0 && (
              <div className="empty"><Ic n="image" s={46} c="var(--t3)"/><p>Ajoutez des articles dans vos boutiques</p></div>
            )}
            {allArts.map((art, artIdx)=>(
              <div key={art.id} className="card" style={{marginBottom:13,padding:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                  <div>
                    <span className="tag tgray" style={{fontSize:11}}>{art.siteName}</span>
                    <strong style={{marginLeft:8,fontSize:13.5}}>{art.icon} {art.name}</strong>
                    <span style={{marginLeft:7,fontSize:12,color:"var(--t2)"}}>{art.platform}</span>
                  </div>
                  <div style={{display:"flex",gap:7}}>
                    <button className="btn btn-ac btn-sm" disabled={genLoading||!limits.maxPhotos} onClick={()=>handleGenMedia(art,"photos")}>
                      {genLoading?<span className="spin-w"/>:"📷"} 5 Photos
                    </button>
                    {plan!=="FREE" && (
                      <button className={`btn btn-sm ${isUnlim?"btn-gold":"btn-p"}`} disabled={genLoading} onClick={()=>handleGenMedia(art,"videos")}>
                        🎬 {isUnlim?"5 Vidéos":"Vidéo"}
                      </button>
                    )}
                    {plan==="FREE" && <span className="tag tgray" style={{fontSize:11}}>Vidéos → Pro+</span>}
                  </div>
                </div>
                {(art.media.photos.length>0||art.media.videos.length>0) && (
                  <div className="mgrid">
                    {art.media.photos.map((url,i)=><div key={i} className="mcard"><img src={url} alt="" loading="lazy"/></div>)}
                    {art.media.videos.map((_,i)=>(
                      <div key={i} className="mcard" style={{display:"flex",alignItems:"center",justifyContent:"center",background:"var(--t0)",fontSize:26}}>🎬</div>
                    ))}
                  </div>
                )}
                {/* Pub discrète dans médias uniquement après le 3e article */}
                {showAds && artIdx === 2 && allArts.length > 3 && (
                  <div style={{marginTop:13}}>
                    <AdUnit slot={AD_SLOTS.INFEED} h={72}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab==="profile" && (
          <div className="au">
            <h2 style={{fontFamily:"var(--hf)",fontSize:27,fontWeight:400,marginBottom:18}}>Mon profil</h2>
            <div className="card" style={{padding:22,marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16}}>
                <div>
                  <div style={{fontSize:11,color:"var(--t2)",fontWeight:600,marginBottom:5}}>EMAIL</div>
                  <input className="inp inp-sm" value={user.email} disabled/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--t2)",fontWeight:600,marginBottom:5}}>PLAN · COMMISSION</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span className={`tag ${plan==="UNLIMITED"?"tgold":plan==="FREE"?"tgray":"tg"}`}>{plan}</span>
                    <span style={{fontSize:12.5,color:"var(--t2)"}}>{limits.commission}% / vente</span>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--t2)",fontWeight:600,marginBottom:5}}>CHIFFRE D'AFFAIRES</div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:12}}>
                    <div style={{fontSize:28,fontWeight:700,fontFamily:"var(--hf)"}}>{totalRev.toFixed(2)}€</div>
                    <Sparkline data={revenueData} color="var(--ac)" h={36} w={100}/>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--t2)",fontWeight:600,marginBottom:5}}>PARRAINAGE</div>
                  <div className="ref-box" onClick={()=>{ navigator.clipboard?.writeText(`ghostify.fr/ref/${user.referralCode}`); showToast("Lien copié !"); }}>
                    <Ic n="copy" s={14}/><span>ghostify.fr/ref/{user.referralCode}</span>
                  </div>
                </div>
              </div>
              <div style={{marginTop:16,display:"flex",gap:9,flexWrap:"wrap"}}>
                <button className="btn btn-o btn-sm" onClick={()=>setShowReset(true)}>
                  <Ic n="lock" s={13}/> Changer mot de passe
                </button>
              </div>
            </div>
            {hasLogo && <LogoGen onToast={showToast}/>}
            {plan!=="UNLIMITED" && (
              <div style={{marginBottom:20}}>
                <h3 style={{fontFamily:"var(--hf)",fontSize:20,fontWeight:400,marginBottom:14}}>Passer à un plan supérieur</h3>
                <div style={{display:"flex",gap:9,marginBottom:16}}>
                  <input className="inp inp-sm" style={{maxWidth:220}} placeholder="Code promo" value={promoInput} onChange={e=>setPromoInput(e.target.value.toUpperCase())}/>
                  <button className="btn btn-o btn-sm" onClick={applyPromoCode}><Ic n="tag" s={13}/> Appliquer</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14}}>
                  {Object.entries(PLANS).filter(([k])=>k!=="FREE"&&TIERS[k]>TIERS[plan]).map(([key,p])=>(
                    <div key={key} className={`plan-card ${key==="ULTIMATE"?"hot":""}`}>
                      {key==="ULTIMATE" && (
                        <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:"var(--gold)",color:"#1a1000",borderRadius:20,padding:"2px 13px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>
                          ⭐ POPULAIRE
                        </div>
                      )}
                      <div style={{fontWeight:700,fontSize:16}}>{p.label}</div>
                      <div style={{fontFamily:"var(--hf)",fontSize:32,fontWeight:600,lineHeight:1}}>
                        {p.price}€<span style={{fontSize:13,fontWeight:400}}>/mois</span>
                      </div>
                      <div style={{fontSize:12.5,color:"var(--t2)"}}>✓ {p.templates} templates</div>
                      <div style={{fontSize:12.5,color:"var(--t2)"}}>✓ {p.maxSites>100?"Illimité":p.maxSites} boutiques</div>
                      <div style={{fontSize:12.5,color:"var(--t2)"}}>✓ Commission {p.commission}%</div>
                      {p.maxVideos>0 && <div style={{fontSize:12.5,color:"var(--t2)"}}>✓ {p.maxVideos>100?"∞":p.maxVideos} vidéos/mois</div>}
                      {p.logoGen   && <div style={{fontSize:12.5,color:"var(--adm)"}}>✓ 🎨 Générateur logo IA</div>}
                      {!p.showAds  && <div style={{fontSize:12.5,color:"var(--ac)"}}>✓ Zéro publicité</div>}
                      <PayPalButton planId={p.ppId} planName={p.label} onSuccess={(sid)=>upgradePlan(key,sid)} onToast={showToast}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sticky ad — uniquement FREE/PRO, après scroll */}
      {showAds && <StickyAd slot={AD_SLOTS.MOBILE_STICKY}/>}

      {siteModal && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setSiteModal(false)}>
          <div className="card au" style={{maxWidth:560,width:"100%",padding:26,maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 style={{fontFamily:"var(--hf)",fontSize:22,fontWeight:400}}>Nouvelle boutique</h3>
              <button className="btn btn-o btn-xs" onClick={()=>setSiteModal(false)}><Ic n="x" s={14}/></button>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11.5,color:"var(--t2)",fontWeight:600,marginBottom:6}}>NOM DE LA BOUTIQUE</div>
              <input className="inp" placeholder="Ex: Ma boutique tech" value={newSiteName} onChange={e=>setNewSiteName(e.target.value)} autoFocus/>
            </div>
            <div style={{marginBottom:hasLogo?16:0}}>
              <TemplatePicker plan={plan} selected={newTemplate} onSelect={setNewTemplate} color={newColor} onColor={setNewColor}/>
            </div>
            {hasLogo && <div style={{marginTop:16}}><LogoGen onToast={showToast}/></div>}
            <div style={{display:"flex",gap:9,marginTop:18}}>
              <button className="btn btn-ac" style={{flex:1}} disabled={!newSiteName.trim()} onClick={handleAddSite}>
                <Ic n="plus" s={14} c="white"/> Créer la boutique
              </button>
              <button className="btn btn-o" onClick={()=>setSiteModal(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {showReset && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowReset(false)}>
          <div className="card" style={{maxWidth:360,width:"90%",padding:24}}>
            <h3 style={{fontFamily:"var(--hf)",fontWeight:400,marginBottom:10}}>Changer le mot de passe</h3>
            <p style={{color:"var(--t2)",fontSize:13,marginBottom:14}}>Un email sera envoyé à {user.email}</p>
            <div style={{display:"flex",gap:9}}>
              <button className="btn btn-p" style={{flex:1}} onClick={handleResetPassword}>Envoyer</button>
              <button className="btn btn-o" style={{flex:1}} onClick={()=>setShowReset(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
