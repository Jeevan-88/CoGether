import { MOVIE_CATALOG } from './movieCatalog.js';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../../core/AuthContext.jsx';
import { useSocial } from '../../core/SocialContext.jsx';
import {
  pushRoute,
  replaceRoute,
  navigateBackSafe,
  subscribeToRoute,
  parseCurrentRoute
} from '../../core/navigationHistory.js';
import './CoWatchTemplateDesign.css';
import { PLATFORM_CATALOGS } from './cowatchPlatformData.js';
import ContentDetailsModal from './components/ContentDetailsModal.jsx';
import WatchTogetherSetupModal from './components/WatchTogetherSetupModal.jsx';
import CinematicCameraOverlay from './components/CinematicCameraOverlay.jsx';

// ── SVG LOGOS FROM EXACT TEMPLATE ──
const L = {
  netflix: { p: "m5.398 0 8.348 23.602c2.346.059 4.856.398 4.856.398L10.113 0H5.398zm8.489 0v9.172l4.715 13.33V0h-4.715zM5.398 1.5V24c1.873-.225 2.81-.312 4.715-.398V14.83L5.398 1.5z", h: "E50914" },
  youtube: { p: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z", h: "FF0000" },
  crunchyroll: { p: "M2.909 13.436C2.914 7.61 7.642 2.893 13.468 2.898c5.576.005 10.137 4.339 10.51 9.819q.021-.351.022-.706C24.007 5.385 18.64.006 12.012 0S.007 5.36 0 11.988 5.36 23.994 11.988 24q.412 0 .815-.027c-5.526-.338-9.9-4.928-9.894-10.538Zm16.284.155a4.1 4.1 0 0 1-4.095-4.103 4.1 4.1 0 0 1 2.712-3.855 8.95 8.95 0 0 0-4.187-1.037 9.007 9.007 0 1 0 8.997 9.016q-.001-.847-.15-1.651a4.1 4.1 0 0 1-3.278 1.63Z", h: "FF5E00" },
  appletv: { p: "M20.57 17.735h-1.815l-3.34-9.203h1.633l2.02 5.987c.075.231.273.9.586 2.012l.297-.997.33-1.006 2.094-6.004H24zm-5.344-.066a5.76 5.76 0 0 1-1.55.207c-1.23 0-1.84-.693-1.84-2.087V9.646h-1.063V8.532h1.121V7.081l1.476-.602v2.062h1.707v1.113H13.38v5.805c0 .446.074.75.214.932.14.182.396.264.75.264.207 0 .495-.041.883-.115zm-7.29-5.343c.017 1.764 1.55 2.358 1.567 2.366-.017.042-.248.842-.808 1.658-.487.71-.99 1.418-1.79 1.435-.783.016-1.03-.462-1.93-.462-.89 0-1.17.445-1.913.478-.758.025-1.344-.775-1.838-1.484-.998-1.451-1.765-4.098-.734-5.88.51-.89 1.426-1.451 2.416-1.46.75-.016 1.468.512 1.93.512.461 0 1.327-.627 2.234-.536.38.016 1.452.157 2.136 1.154-.058.033-1.278.743-1.27 2.219M6.468 7.988c.404-.495.685-1.18.61-1.864-.585.025-1.294.388-1.723.883-.38.437-.71 1.138-.619 1.806.652.05 1.328-.338 1.732-.825Z", h: "000000" },
  dazn: { p: "M14.774 8.291l.772-2.596.79 2.596zm3.848 2.268l-2.025-6.128c-.045-.135-.097-.224-.154-.266-.059-.041-.152-.063-.28-.063h-1.12a.485.485 0 0 0-.284.068c-.06.045-.11.132-.149.261l-2.045 6.128c-.025.032-.038.096-.038.192 0 .149.09.223.27.223h.84c.076 0 .139-.003.187-.01a.207.207 0 0 0 .116-.048.326.326 0 0 0 .077-.116c.022-.051.046-.119.072-.202l.318-1.071h2.306l.327 1.051c.026.09.051.16.077.213a.395.395 0 0 0 .087.12c.031.028.07.047.114.053h.002c.045.006.103.01.173.01h.897c.18 0 .27-.074.27-.223a.59.59 0 0 0-.005-.09.878.878 0 0 0-.036-.108l.003.006zm-.994 2.467h-.646c-.168 0-.279.024-.333.072-.055.049-.082.147-.082.295v3.638l-1.91-3.647c-.076-.155-.152-.253-.226-.295-.074-.041-.204-.063-.39-.063h-.599c-.167 0-.278.025-.332.073-.055.048-.082.147-.082.294v6.138c0 .148.025.246.077.294.052.048.16.072.328.072h.656c.167 0 .278-.024.332-.072.055-.048.082-.146.082-.294v-3.648l1.91 3.657c.077.155.152.253.227.295.073.042.204.062.39.062h.598c.167 0 .278-.024.333-.072.054-.048.082-.146.082-.294v-6.138c0-.148-.028-.246-.082-.294-.055-.048-.166-.073-.333-.073zm3.203-.581l1.665 1.665v8.385H1.505V14.11l1.663-1.664a.63.63 0 0 0 0-.89L1.504 9.891V1.505h20.991v8.384l-1.665 1.666a.63.63 0 0 0 0 .89zM24 0H0v10.613L1.387 12 0 13.387V24h24V13.387L22.613 12 24 10.613zM10.67 18.469H7.96l2.855-4.014a.67.67 0 0 0 .087-.155.425.425 0 0 0 .019-.135v-.772c0-.148-.028-.246-.082-.294-.055-.048-.166-.073-.334-.073H6.382c-.149 0-.245.028-.29.082-.045.055-.068.169-.068.343v.58c0 .172.023.287.068.341.045.055.141.083.29.083h2.545L6.11 18.469a.438.438 0 0 0-.107.27v.792c0 .148.027.245.082.294.055.048.167.072.334.072h4.25c.148 0 .245-.027.29-.081.045-.055.068-.17.068-.344v-.579c0-.173-.023-.287-.068-.342-.045-.055-.142-.082-.29-.082zM9.408 8.233c0 .264-.017.484-.052.661-.036.177-.093.32-.174.43a.648.648 0 0 1-.318.231 1.523 1.523 0 0 1-.487.068h-.79v-4.17h.79c.366 0 .63.11.79.324.16.215.241.571.241 1.067v1.389zm1.38-2.789c-.225-.457-.533-.795-.921-1.013-.39-.219-.88-.328-1.47-.328H6.418c-.167 0-.278.024-.333.072-.054.049-.082.147-.082.294v6.138c0 .148.028.246.082.295.055.048.166.072.333.072h2.218c1.048 0 1.765-.447 2.15-1.342.09-.205.153-.413.188-.622a4.91 4.91 0 0 0 .054-.796V6.911c0-.367-.018-.656-.054-.868a2.2 2.2 0 0 0-.193-.612l.006.013z", h: "F8F8F5" },
  twitch: { p: "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z", h: "9146FF" },
  tubi: { p: "M16.696 15.272v-.752c.4.548 1.107.917 1.934.917 1.475 0 2.28-.956 2.28-2.865 0-1.714-.893-2.858-2.235-2.858-.851 0-1.55.347-1.979.908v-2.06h-2.674v6.71zm1.57-2.614c0 .827-.337 1.275-.827 1.275-.486 0-.837-.452-.837-1.275s.342-1.28.837-1.28c.495 0 .828.452.828 1.28zM6.94 9.988v3.6c0 1.236.754 1.841 1.955 1.841.959 0 1.625-.396 2.028-1.064v.91h2.597V9.989h-2.675v3.14c0 .493-.346.693-.666.693-.321 0-.568-.192-.568-.655V9.989Zm14.39 0H24v5.276h-2.67ZM6.553 11.136c0 .781-.635 1.415-1.42 1.415-.783 0-1.419-.634-1.419-1.415 0-.782.636-1.415 1.42-1.415.784 0 1.42.633 1.42 1.415zM3.49 9.702v2.668c.005.653.327.924.976.924.225 0 .526-.053.672-.166v1.931c-.49.243-.869.378-1.535.378 0 0-.069 0-.18-.006l-.003.006c-1.614 0-2.51-1.035-2.482-2.686v-.47H0V9.99h.92V8.563h2.569Z", h: "7408FF" },
  hbomax: { p: "M3.784 8.716c-.655 0-1.32.29-2.173.946v-.78H0v6.236h1.715V11.24c.749-.592 1.091-.78 1.372-.78.333 0 .551.209.551.729v3.928h1.715V11.23c.748-.582 1.081-.769 1.372-.769.333 0 .55.208.55.728v3.928H8.99v-4.53c0-1.403-.8-1.871-1.57-1.871-.654 0-1.32.27-2.192.936-.28-.697-.894-.936-1.444-.936zm8.689 0c-1.705 0-3.118 1.466-3.118 3.284 0 1.82 1.413 3.285 3.118 3.285.842 0 1.57-.312 2.131-.988v.82h1.632V8.883h-1.632v.822c-.561-.676-1.29-.988-2.131-.988zm4.064.166c.707 1.102 1.507 2.09 2.443 3.077a26.593 26.593 0 0 0-2.443 3.16h2.069a13.603 13.603 0 0 1 1.673-2.183 14.067 14.067 0 0 1 1.632 2.182H24a25.142 25.142 0 0 0-2.432-3.16A23.918 23.918 0 0 0 24 8.883h-2.047a14.65 14.65 0 0 1-1.674 2.11 13.357 13.357 0 0 1-1.674-2.11zm-3.804 1.279c1.018 0 1.84.82 1.84 1.84a1.837 1.837 0 0 1-1.84 1.839c-1.019 0-1.84-.82-1.84-1.84 0-1.018.821-1.84 1.84-1.84zm0 .415c-.78 0-1.414.633-1.414 1.423s.634 1.424 1.413 1.424c.78 0 1.414-.634 1.414-1.424s-.634-1.424-1.414-1.424z", h: "000000" },
  vimeo: { p: "M23.9765 6.4168c-.105 2.338-1.739 5.5429-4.894 9.6088-3.2679 4.247-6.0258 6.3699-8.2898 6.3699-1.409 0-2.578-1.294-3.553-3.881l-1.9179-7.1138c-.719-2.584-1.488-3.878-2.312-3.878-.179 0-.806.378-1.8809 1.132l-1.129-1.457a315.06 315.06 0 003.501-3.1279c1.579-1.368 2.765-2.085 3.5539-2.159 1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.5069.5389 2.45 1.1309 3.674 1.7759 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.8679 3.434-5.7568 6.7619-5.6368 2.4729.06 3.6279 1.664 3.4929 4.7969z", h: "1AB7EA" },
  paramountplus: { p: "M16.347 21.373c.057-.084.151-.314-.025-.74l-.53-1.428c-.073-.182.084-.293.19-.173 0 0 1.004 1.157 1.264 1.64l.495.822c.425.028 1.6.06 2.732.06a3.26 3.26 0 0 1-.316-.364c-1.93-2.392-3.154-3.724-3.166-3.737-.391-.426-.572-.508-.87-.643a4.82 4.82 0 0 1-.138-.065v.364c0 .047-.057.073-.086.022l-2.846-5.001a1.598 1.598 0 0 0-.508-.587l-.277-.194-1.354 3.123c.212 0 .354.216.27.409l-1.25 2.893h1.147c.443 0 .883.087 1.294.255l.302.125s-.913 1.878-.913 2.867c0 .181.028.362.075.534h2.104l-.096-.595s1.266.294 2.502.413M12 2.437c-6.627 0-12 5.373-12 12 0 2.669.873 5.133 2.346 7.126.503-.218.783-.542.983-.791l2.234-2.858a.467.467 0 0 1 .179-.138l.336-.146 3.674-4.659.534-.417 1.094-1.524a.482.482 0 0 1 .101-.102l.478-.347a.34.34 0 0 1 .398-.004l.578.407c.308.216.557.504.726.84l2.322 4.077c.051.09.09.129.182.174.454.227.732.268 1.33.913.277.304 1.495 1.666 3.203 3.784.236.318.538.588.963.783A11.948 11.948 0 0 0 24 14.437c0-6.627-5.373-12-12-12", h: "0064FF" },
  bilibili: { p: "M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773z", h: "00A1D6" },
  primevideo: { p: "M0 9.508c0-.043.01-.073.028-.09.018-.017.047-.025.086-.025h.329c.07 0 .112.034.127.101l.032.119c.091-.088.202-.159.33-.21a1.04 1.04 0 0 1 .396-.079c.294 0 .528.109.7.326.171.217.257.51.257.88 0 .254-.042.475-.127.665-.086.19-.201.335-.347.437a.85.85 0 0 1-.502.154c-.125 0-.243-.02-.355-.06a.857.857 0 0 1-.288-.164v1.003c0 .043-.008.073-.025.09-.017.016-.046.025-.09.025H.115c-.04 0-.068-.009-.086-.025-.019-.017-.028-.047-.028-.09zm1.113.32a.868.868 0 0 0-.447.124v1.206a.834.834 0 0 0 .447.124c.17 0 .296-.058.376-.174.081-.117.121-.3.121-.55 0-.254-.04-.439-.118-.555-.08-.116-.206-.174-.379-.174zm2.248-.087c.121-.134.236-.23.344-.286a.733.733 0 0 1 .345-.085h.063c.043 0 .073.009.092.025.018.017.027.047.027.09v.385c0 .04-.008.068-.025.087-.017.018-.046.027-.089.027a.923.923 0 0 1-.082-.004 1.369 1.369 0 0 0-.383.025c-.1.02-.186.045-.256.076v1.54c0 .04-.008.069-.025.087-.016.018-.046.028-.089.028h-.437c-.04 0-.069-.01-.087-.028-.018-.018-.028-.047-.028-.087V9.508c0-.043.01-.073.028-.09.018-.017.047-.025.087-.025h.328c.07 0 .112.034.128.1z", h: "1F2E3E" },
  hulu: { p: "M14.707 15.957h1.912V8.043h-1.912zm-3.357-2.256a.517.517 0 01-.512.511H9.727a.517.517 0 01-.512-.511v-3.19H7.303v3.345c0 1.368.879 2.09 2.168 2.09h1.868c1.189 0 1.912-.856 1.912-2.09V10.51h-1.912c.01 0 .01 3.09.01 3.19zm10.75-3.19v3.19a.517.517 0 01-.512.511h-1.112a.517.517 0 01-.511-.511v-3.19h-1.912v3.345c0 1.368.878 2.09 2.167 2.09h1.868c1.19 0 1.912-.856 1.912-2.09V10.51zm-18.32 0H2.557c-.434 0-.645.11-.645.11V8.044H0v7.903h1.9v-3.179c0-.278.234-.511.512-.511h1.112c.278 0 .511.233.511.511v3.19h1.912v-3.446c0-1.445-.967-2-2.167-2Z", h: "1CE783" }
};

const N = {
  netflix: 'Netflix',
  youtube: 'YouTube',
  crunchyroll: 'Crunchyroll',
  appletv: 'Apple TV+',
  dazn: 'DAZN',
  twitch: 'Twitch',
  tubi: 'Tubi',
  hbomax: 'Max',
  hulu: 'Hulu',
  paramountplus: 'Paramount+',
  bilibili: 'Bilibili',
  nbc: 'NBC',
  primevideo: 'Prime Video'
};

const renderLogo = (k, size = 18) => {
  if (!L[k]) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d={L[k].p} />
    </svg>
  );
};

// ── HERO DATA (Exact Verified Titles from Master Catalog) ──
const H = [
  {
    t: 'Attack on Titan Part 1: Guren no Yumiya',
    m: '2014 · Anime Action · 1h 59m',
    a: '#8a1e2b',
    b: '#2a1518',
    bg: '#180a0e',
    x: 65,
    y: 30,
    poster: 'https://img.youtube.com/vi/AHT772bRkMY/maxresdefault.jpg',
    stream: 'https://www.youtube.com/watch?v=AHT772bRkMY',
    ytId: 'AHT772bRkMY',
    platform: 'youtube',
    tag: 'Featured Anime Stream',
    synopsis: 'When the Colossal Titan breaches Wall Maria, Eren Yeager pledges to exterminate every Titan on Earth. Watch the complete feature-length anime movie directly.'
  },
  {
    t: 'Akira',
    m: '1988 · Cyberpunk Anime · 2h 04m',
    a: '#c5222f',
    b: '#2d1630',
    bg: '#1a0b12',
    x: 75,
    y: 25,
    poster: 'https://upload.wikimedia.org/wikipedia/en/5/5d/AKIRA_%281988_poster%29.jpg',
    stream: 'https://www.youtube.com/watch?v=YvfWrC5prvU',
    ytId: 'YvfWrC5prvU',
    platform: 'youtube',
    tag: 'Legendary Masterpiece',
    synopsis: 'A secret military project endangers Neo-Tokyo when a biker gang member acquires uncontrollable telekinetic powers.'
  },
  {
    t: 'Ramayana: The Legend of Prince Rama',
    m: '1992 · Anime Epic · 2h 15m',
    a: '#c97d28',
    b: '#2f1b40',
    bg: '#1c1010',
    x: 50,
    y: 35,
    poster: 'https://img.youtube.com/vi/qv9z4rp375U/maxresdefault.jpg',
    stream: 'https://www.youtube.com/watch?v=qv9z4rp375U',
    ytId: 'qv9z4rp375U',
    platform: 'youtube',
    tag: 'Animation Classic',
    synopsis: 'Prince Rama is exiled from Ayodhya and embarks on a sacred quest across ancient India with Lakshmana and Hanuman to rescue Sita from Ravana.'
  },
  {
    t: 'Night of the Living Dead',
    m: '1968 · Horror · 1h 35m',
    a: '#6b1530',
    b: '#3a3a3f',
    bg: '#1a0c12',
    x: 72,
    y: 28,
    poster: 'https://archive.org/download/night_of_the_living_dead_ipod/__ia_thumb.jpg',
    stream: 'https://archive.org/download/night_of_the_living_dead_ipod/night_of_the_living_dead.mp4',
    platform: 'tubi',
    tag: 'Free Public Domain Cinema',
    synopsis: 'Strangers barricade themselves in a rural farmhouse to defend against flesh-eating ghouls in George A. Romero groundbreaking horror landmark.'
  }
];

// ── FOCUS CAROUSEL DATA (8 Trending Titles from Template) ──
const T = [
  { t: 'Attack on Titan Part 1: Guren no Yumiya', y: '2014 · 1h 59m', r: '9.1', p: 'crunchyroll', a: '#8a1e2b', b: '#2a1518', poster: 'https://img.youtube.com/vi/AHT772bRkMY/maxresdefault.jpg', desc: 'When the Colossal Titan breaches Wall Maria, Eren Yeager pledges to join the Scout Regiment to exterminate every Titan on Earth.' },
  { t: 'Akira', y: '1988 · 2h 04m', r: '8.8', p: 'crunchyroll', a: '#c5222f', b: '#2d1630', poster: 'https://upload.wikimedia.org/wikipedia/en/5/5d/AKIRA_%281988_poster%29.jpg', desc: 'A secret military project endangers Neo-Tokyo when a biker gang member acquires uncontrollable telekinetic powers.' },
  { t: 'SPY × FAMILY CODE: White', y: '2023 · 1h 50m', r: '8.7', p: 'crunchyroll', a: '#e0536c', b: '#2f1525', poster: 'https://upload.wikimedia.org/wikipedia/en/b/be/Spy_%C3%97_Family_Code_White_poster.jpg', desc: 'While on a winter family trip, Anya accidentally swallows a chocolate concealing secret microfilm.' },
  { t: 'Ramayana: The Legend of Prince Rama', y: '1992 · 2h 15m', r: '9.3', p: 'crunchyroll', a: '#c97d28', b: '#2f1b40', poster: 'https://img.youtube.com/vi/qv9z4rp375U/maxresdefault.jpg', desc: 'Prince Rama is exiled from Ayodhya and embarks on a sacred quest to rescue Sita from the demon king Ravana.' },
  { t: 'Night of the Living Dead', y: '1968 · 1h 35m', r: '8.2', p: 'tubi', a: '#6b1530', b: '#3a3a3f', poster: 'https://archive.org/download/night_of_the_living_dead_ipod/__ia_thumb.jpg', desc: 'Strangers barricade themselves in a rural farmhouse to defend against flesh-eating ghouls in George Romero’s classic.' },
  { t: 'House on Haunted Hill', y: '1959 · 1h 15m', r: '8.1', p: 'tubi', a: '#8d8a92', b: '#5a1228', poster: 'https://archive.org/download/The_House_On_Haunted_Hill/__ia_thumb.jpg', desc: 'An eccentric millionaire offers $10,000 to five guests if they can survive an entire night locked in a haunted mansion.' },
  { t: 'The General', y: '1926 · 1h 18m', r: '8.5', p: 'tubi', a: '#9a2a45', b: '#4a4a50', poster: 'https://archive.org/download/TheGeneral/__ia_thumb.jpg', desc: 'Buster Keaton stars as train engineer Johnnie Gray racing behind enemy lines to rescue his beloved locomotive.' },
  { t: 'Little Nemo: Adventures in Slumberland', y: '1989 · 1h 25m', r: '8.3', p: 'crunchyroll', a: '#3d6fa0', b: '#1e2540', poster: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Little_Nemo_Adventures_in_Slumberland_poster.jpg', desc: 'A young boy journeys into the magnificent kingdom of Slumberland to rescue King Morpheus with the royal scepter.' }
];

// ── CATEGORIES DATA (Exact Mapping from Template + Enhanced Catalogs) ──
const C = {
  Movies: {
    plats: ['tubi', 'netflix', 'primevideo', 'hbomax', 'appletv', 'hulu', 'paramountplus'],
    items: [
      {
            "t": "Night of the Living Dead",
            "p": "tubi",
            "y": "1968 \u00b7 1h 35m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/night_of_the_living_dead_ipod/night_of_the_living_dead.mp4",
            "poster": "https://archive.org/download/night_of_the_living_dead_ipod/__ia_thumb.jpg",
            "desc": "Strangers barricade themselves in a rural farmhouse to defend against flesh-eating ghouls in George A. Romero's groundbreaking independent horror landmark."
      },
      {
            "t": "House on Haunted Hill",
            "p": "tubi",
            "y": "1959 \u00b7 1h 15m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/The_House_On_Haunted_Hill/The_House_On_Haunted_Hill.mp4",
            "poster": "https://archive.org/download/The_House_On_Haunted_Hill/__ia_thumb.jpg",
            "desc": "An eccentric millionaire offers $10,000 to five guests if they can survive an entire night locked inside his terrifying haunted mansion with sinister traps."
      },
      {
            "t": "The General",
            "p": "tubi",
            "y": "1927 \u00b7 1h 19m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/TheGeneral/The_General_512kb.mp4",
            "poster": "https://archive.org/download/TheGeneral/__ia_thumb.jpg",
            "desc": "Buster Keaton stars as train engineer Johnnie Gray, who single-handedly races deep behind enemy lines to rescue his beloved locomotive and the woman he loves."
      },
      {
            "t": "The Phantom of the Opera",
            "p": "tubi",
            "y": "1925 \u00b7 1h 33m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/ThePhantomOfTheOpera_364/ThePhantomOfTheOperaPresentedByMoviePowder_512kb.mp4",
            "poster": "https://archive.org/download/ThePhantomOfTheOpera_364/__ia_thumb.jpg",
            "desc": "Lon Chaney delivers an unforgettable performance as the disfigured phantom who haunts the subterranean vaults of the Paris Opera House."
      },
      {
            "t": "The Terror",
            "p": "tubi",
            "y": "1963 \u00b7 1h 21m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/TheTerror/TheTerror.mp4",
            "poster": "https://archive.org/download/TheTerror/__ia_thumb.jpg",
            "desc": "A lost French officer under Napoleon is captivated by an enigmatic maiden who leads him to the remote gothic castle of the reclusive Baron von Leppe."
      },
      {
            "t": "The Torch",
            "p": "tubi",
            "y": "1950 \u00b7 1h 24m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/the-torch-1950/The%20Torch%20%281950%29.mp4",
            "poster": "https://archive.org/download/the-torch-1950/__ia_thumb.jpg",
            "desc": "During the Mexican Revolution, guerrilla rebel leader General Jose Juan Reyes captures a small town and falls passionately in love with the fiery daughter of the local grandee."
      },
      {
            "t": "The Man Who Cheated Himself",
            "p": "tubi",
            "y": "1950 \u00b7 1h 21m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/TheManWhoCheatedHimself1950/TheManWhoCheatedHimself1950.mp4",
            "poster": "https://archive.org/download/TheManWhoCheatedHimself1950/__ia_thumb.jpg",
            "desc": "A veteran San Francisco homicide detective helps his socialite lover conceal her husband's murder, only to have his rookie younger brother assigned to solve the case."
      },
      {
            "t": "Tomorrow We Live",
            "p": "tubi",
            "y": "1942 \u00b7 1h 25m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/TomorrowWeLive/TomorrowWeLive.mp4",
            "poster": "https://archive.org/download/TomorrowWeLive/__ia_thumb.jpg",
            "desc": "In occupied coastal France, brave French Resistance saboteurs risk their lives in the underground network to transmit vital German naval secrets to British intelligence."
      },
      {
            "t": "His Girl Friday",
            "p": "tubi",
            "y": "1940 \u00b7 1h 32m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/his_girl_friday/his_girl_friday.mp4",
            "poster": "https://archive.org/download/his_girl_friday/__ia_thumb.jpg",
            "desc": "Howard Hawks' lightning-fast screwball comedy starring Cary Grant as an unscrupulous newspaper editor plotting to win back ace reporter ex-wife Rosalind Russell."
      },
      {
            "t": "I Accuse My Parents",
            "p": "tubi",
            "y": "1944 \u00b7 1h 08m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/IAccuseMyParents/IAccuseMyParents.mp4",
            "poster": "https://archive.org/download/IAccuseMyParents/__ia_thumb.jpg",
            "desc": "Neglected by his alcoholic parents, high-school essay champion Jimmy Wilson gets swept up in a dangerous criminal syndicate before standing trial."
      },
      {
            "t": "He Walked by Night",
            "p": "tubi",
            "y": "1948 \u00b7 1h 19m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/He_Walked_by_Night_1948/He_Walked_by_Night.mp4",
            "poster": "https://archive.org/download/He_Walked_by_Night_1948/__ia_thumb.jpg",
            "desc": "A brilliant, tech-savvy burglar and cop killer eludes LAPD detectives through the storm drain tunnels beneath Los Angeles in this gritty proto-Dragnet procedural."
      },
      {
            "t": "Blood on the Sun",
            "p": "tubi",
            "y": "1945 \u00b7 1h 34m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/BloodontheSun/BloodontheSun.mp4",
            "poster": "https://archive.org/download/BloodontheSun/__ia_thumb.jpg",
            "desc": "James Cagney plays Nick Condon, an American newspaper editor in pre-WWII Tokyo who uncovers a secret imperial blueprint for world conquest."
      },
      {
            "t": "Detour",
            "p": "tubi",
            "y": "1945 \u00b7 1h 07m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/Detour_66/DetourPresentedByMoviePowder.mp4",
            "poster": "https://archive.org/download/Detour_66/__ia_thumb.jpg",
            "desc": "Edgar G. Ulmer's quintessential poverty-row noir: hitchhiker Al Roberts falls into a spiral of accidental death and merciless blackmail on the lonely desert road."
      },
      {
            "t": "Love Island",
            "p": "tubi",
            "y": "1950 \u00b7 1h 06m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/love_island/love_island.mp4",
            "poster": "https://archive.org/download/love_island/__ia_thumb.jpg",
            "desc": "An American naval flyer is forced to parachute over a secluded tropical paradise where he helps an island princess avoid an arranged marriage with a despotic tribal chief."
      },
      {
            "t": "The Payoff",
            "p": "tubi",
            "y": "1942 \u00b7 56m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/payoff_ipod/payoff.mp4",
            "poster": "https://archive.org/download/payoff_ipod/__ia_thumb.jpg",
            "desc": "A crusade by a principled newspaper reporter against a city boss unearths bribery, corruption and framed murders."
      },
      {
            "t": "The Fatal Hour",
            "p": "tubi",
            "y": "1940 \u00b7 1h 08m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/fatal_hour/fatal_hour.mp4",
            "poster": "https://archive.org/download/fatal_hour/__ia_thumb.jpg",
            "desc": "Boris Karloff portrays brilliant Chinese-American detective James Lee Wong investigating the suspicious waterfront murder of an undercover police officer."
      },
      {
            "t": "Sherlock Holmes and the Secret Weapon",
            "p": "tubi",
            "y": "1943 \u00b7 1h 08m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/secret_weapon/sherlock_holmes_and_the_secret_weapon.mp4",
            "poster": "https://archive.org/download/secret_weapon/__ia_thumb.jpg",
            "desc": "Basil Rathbone and Nigel Bruce face off against Professor Moriarty to protect a brilliant Swiss scientist's newly invented bomb sight for allied forces."
      },
      {
            "t": "Namakura Gatana",
            "p": "tubi",
            "y": "1917 \u00b7 5m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/namakura-gatana-1917/Namakura%20Gatana%201917%20restoration.ia.mp4",
            "poster": "https://archive.org/download/namakura-gatana-1917/__ia_thumb.jpg",
            "desc": "The oldest surviving Japanese animated short film, created by Junichi Kouchi, portraying a dim-witted samurai testing a blunt sword on townspeople."
      },
      {
            "t": "The Cameraman's Revenge",
            "p": "tubi",
            "y": "1912 \u00b7 13m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/TheCameramansRevenge/TheCameramansRevenge.mp4",
            "poster": "https://archive.org/download/TheCameramansRevenge/__ia_thumb.jpg",
            "desc": "Wladyslaw Starewicz's legendary stop-motion puppet comedy using preserved insect specimens, depicting a grasshopper projectionist avenging an infidelity."
      },
      {
            "t": "Go for Broke!",
            "p": "tubi",
            "y": "1951 \u00b7 1h 32m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/go_for_broke_ACM/Go_for_Broke.mp4",
            "poster": "https://archive.org/download/go_for_broke_ACM/__ia_thumb.jpg",
            "desc": "The courageous real-life story of the U.S. Army's 442nd Regimental Combat Team, composed predominantly of Nisei Japanese-American soldiers in WWII Europe."
      }
]
  },
  'Free Movies': {
    plats: ['tubi'],
    items: [
      {
            "t": "Night of the Living Dead",
            "p": "tubi",
            "y": "1968 \u00b7 1h 35m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/night_of_the_living_dead_ipod/night_of_the_living_dead.mp4",
            "poster": "https://archive.org/download/night_of_the_living_dead_ipod/__ia_thumb.jpg",
            "desc": "Strangers barricade themselves in a rural farmhouse to defend against flesh-eating ghouls in George A. Romero's groundbreaking independent horror landmark."
      },
      {
            "t": "House on Haunted Hill",
            "p": "tubi",
            "y": "1959 \u00b7 1h 15m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/The_House_On_Haunted_Hill/The_House_On_Haunted_Hill.mp4",
            "poster": "https://archive.org/download/The_House_On_Haunted_Hill/__ia_thumb.jpg",
            "desc": "An eccentric millionaire offers $10,000 to five guests if they can survive an entire night locked inside his terrifying haunted mansion with sinister traps."
      },
      {
            "t": "The General",
            "p": "tubi",
            "y": "1927 \u00b7 1h 19m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/TheGeneral/The_General_512kb.mp4",
            "poster": "https://archive.org/download/TheGeneral/__ia_thumb.jpg",
            "desc": "Buster Keaton stars as train engineer Johnnie Gray, who single-handedly races deep behind enemy lines to rescue his beloved locomotive and the woman he loves."
      },
      {
            "t": "The Phantom of the Opera",
            "p": "tubi",
            "y": "1925 \u00b7 1h 33m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/ThePhantomOfTheOpera_364/ThePhantomOfTheOperaPresentedByMoviePowder_512kb.mp4",
            "poster": "https://archive.org/download/ThePhantomOfTheOpera_364/__ia_thumb.jpg",
            "desc": "Lon Chaney delivers an unforgettable performance as the disfigured phantom who haunts the subterranean vaults of the Paris Opera House."
      },
      {
            "t": "The Terror",
            "p": "tubi",
            "y": "1963 \u00b7 1h 21m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/TheTerror/TheTerror.mp4",
            "poster": "https://archive.org/download/TheTerror/__ia_thumb.jpg",
            "desc": "A lost French officer under Napoleon is captivated by an enigmatic maiden who leads him to the remote gothic castle of the reclusive Baron von Leppe."
      },
      {
            "t": "The Torch",
            "p": "tubi",
            "y": "1950 \u00b7 1h 24m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/the-torch-1950/The%20Torch%20%281950%29.mp4",
            "poster": "https://archive.org/download/the-torch-1950/__ia_thumb.jpg",
            "desc": "During the Mexican Revolution, guerrilla rebel leader General Jose Juan Reyes captures a small town and falls passionately in love with the fiery daughter of the local grandee."
      },
      {
            "t": "The Man Who Cheated Himself",
            "p": "tubi",
            "y": "1950 \u00b7 1h 21m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/TheManWhoCheatedHimself1950/TheManWhoCheatedHimself1950.mp4",
            "poster": "https://archive.org/download/TheManWhoCheatedHimself1950/__ia_thumb.jpg",
            "desc": "A veteran San Francisco homicide detective helps his socialite lover conceal her husband's murder, only to have his rookie younger brother assigned to solve the case."
      },
      {
            "t": "Tomorrow We Live",
            "p": "tubi",
            "y": "1942 \u00b7 1h 25m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/TomorrowWeLive/TomorrowWeLive.mp4",
            "poster": "https://archive.org/download/TomorrowWeLive/__ia_thumb.jpg",
            "desc": "In occupied coastal France, brave French Resistance saboteurs risk their lives in the underground network to transmit vital German naval secrets to British intelligence."
      },
      {
            "t": "His Girl Friday",
            "p": "tubi",
            "y": "1940 \u00b7 1h 32m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/his_girl_friday/his_girl_friday.mp4",
            "poster": "https://archive.org/download/his_girl_friday/__ia_thumb.jpg",
            "desc": "Howard Hawks' lightning-fast screwball comedy starring Cary Grant as an unscrupulous newspaper editor plotting to win back ace reporter ex-wife Rosalind Russell."
      },
      {
            "t": "I Accuse My Parents",
            "p": "tubi",
            "y": "1944 \u00b7 1h 08m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/IAccuseMyParents/IAccuseMyParents.mp4",
            "poster": "https://archive.org/download/IAccuseMyParents/__ia_thumb.jpg",
            "desc": "Neglected by his alcoholic parents, high-school essay champion Jimmy Wilson gets swept up in a dangerous criminal syndicate before standing trial."
      },
      {
            "t": "He Walked by Night",
            "p": "tubi",
            "y": "1948 \u00b7 1h 19m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/He_Walked_by_Night_1948/He_Walked_by_Night.mp4",
            "poster": "https://archive.org/download/He_Walked_by_Night_1948/__ia_thumb.jpg",
            "desc": "A brilliant, tech-savvy burglar and cop killer eludes LAPD detectives through the storm drain tunnels beneath Los Angeles in this gritty proto-Dragnet procedural."
      },
      {
            "t": "Blood on the Sun",
            "p": "tubi",
            "y": "1945 \u00b7 1h 34m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/BloodontheSun/BloodontheSun.mp4",
            "poster": "https://archive.org/download/BloodontheSun/__ia_thumb.jpg",
            "desc": "James Cagney plays Nick Condon, an American newspaper editor in pre-WWII Tokyo who uncovers a secret imperial blueprint for world conquest."
      },
      {
            "t": "Detour",
            "p": "tubi",
            "y": "1945 \u00b7 1h 07m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/Detour_66/DetourPresentedByMoviePowder.mp4",
            "poster": "https://archive.org/download/Detour_66/__ia_thumb.jpg",
            "desc": "Edgar G. Ulmer's quintessential poverty-row noir: hitchhiker Al Roberts falls into a spiral of accidental death and merciless blackmail on the lonely desert road."
      },
      {
            "t": "Love Island",
            "p": "tubi",
            "y": "1950 \u00b7 1h 06m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/love_island/love_island.mp4",
            "poster": "https://archive.org/download/love_island/__ia_thumb.jpg",
            "desc": "An American naval flyer is forced to parachute over a secluded tropical paradise where he helps an island princess avoid an arranged marriage with a despotic tribal chief."
      },
      {
            "t": "The Payoff",
            "p": "tubi",
            "y": "1942 \u00b7 56m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/payoff_ipod/payoff.mp4",
            "poster": "https://archive.org/download/payoff_ipod/__ia_thumb.jpg",
            "desc": "A crusade by a principled newspaper reporter against a city boss unearths bribery, corruption and framed murders."
      },
      {
            "t": "The Fatal Hour",
            "p": "tubi",
            "y": "1940 \u00b7 1h 08m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/fatal_hour/fatal_hour.mp4",
            "poster": "https://archive.org/download/fatal_hour/__ia_thumb.jpg",
            "desc": "Boris Karloff portrays brilliant Chinese-American detective James Lee Wong investigating the suspicious waterfront murder of an undercover police officer."
      },
      {
            "t": "Sherlock Holmes and the Secret Weapon",
            "p": "tubi",
            "y": "1943 \u00b7 1h 08m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/secret_weapon/sherlock_holmes_and_the_secret_weapon.mp4",
            "poster": "https://archive.org/download/secret_weapon/__ia_thumb.jpg",
            "desc": "Basil Rathbone and Nigel Bruce face off against Professor Moriarty to protect a brilliant Swiss scientist's newly invented bomb sight for allied forces."
      },
      {
            "t": "Namakura Gatana",
            "p": "tubi",
            "y": "1917 \u00b7 5m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/namakura-gatana-1917/Namakura%20Gatana%201917%20restoration.ia.mp4",
            "poster": "https://archive.org/download/namakura-gatana-1917/__ia_thumb.jpg",
            "desc": "The oldest surviving Japanese animated short film, created by Junichi Kouchi, portraying a dim-witted samurai testing a blunt sword on townspeople."
      },
      {
            "t": "The Cameraman's Revenge",
            "p": "tubi",
            "y": "1912 \u00b7 13m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/TheCameramansRevenge/TheCameramansRevenge.mp4",
            "poster": "https://archive.org/download/TheCameramansRevenge/__ia_thumb.jpg",
            "desc": "Wladyslaw Starewicz's legendary stop-motion puppet comedy using preserved insect specimens, depicting a grasshopper projectionist avenging an infidelity."
      },
      {
            "t": "Go for Broke!",
            "p": "tubi",
            "y": "1951 \u00b7 1h 32m",
            "r": "8.2",
            "free": true,
            "stream": "https://archive.org/download/go_for_broke_ACM/Go_for_Broke.mp4",
            "poster": "https://archive.org/download/go_for_broke_ACM/__ia_thumb.jpg",
            "desc": "The courageous real-life story of the U.S. Army's 442nd Regimental Combat Team, composed predominantly of Nisei Japanese-American soldiers in WWII Europe."
      }
]
  },
  Series: {
    plats: ['netflix', 'hbomax', 'appletv', 'hulu', 'primevideo', 'crunchyroll', 'paramountplus'],
    items: [
      { t: 'Severance', p: 'appletv', y: '2022 · 2 Seasons', r: '8.7', poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' },
      { t: 'The Bear', p: 'hulu', y: '2022 · 3 Seasons', r: '8.6', poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80' },
      { t: 'Arcane', p: 'netflix', y: '2021 · 2 Seasons', r: '9.0', poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80' },
      { t: 'House of the Dragon', p: 'hbomax', y: '2022 · 2 Seasons', r: '8.5', poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80' },
      { t: 'The Boys', p: 'primevideo', y: '2019 · 4 Seasons', r: '8.7', poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80' },
      { t: 'Stranger Things', p: 'netflix', y: '2016 · 4 Seasons', r: '8.7', poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  Anime: {
    plats: ['youtube', 'crunchyroll', 'netflix', 'bilibili', 'tubi', 'primevideo'],
    items: [
      {
        "t": "Attack on Titan Part 1: Guren no Yumiya",
        "p": "youtube",
        "y": "2014 · 1h 59m",
        "r": "9.1",
        "free": true,
        "ytId": "AHT772bRkMY",
        "stream": "https://www.youtube.com/watch?v=AHT772bRkMY",
        "poster": "https://img.youtube.com/vi/AHT772bRkMY/maxresdefault.jpg",
        "desc": "When the Colossal Titan shatters Wall Maria, Eren Yeager witnesses his mother being devoured and pledges to join the Scout Regiment to exterminate every Titan on Earth."
      },
      {
        "t": "Akira",
        "p": "youtube",
        "y": "1988 · 2h 04m",
        "r": "8.8",
        "free": true,
        "ytId": "YvfWrC5prvU",
        "stream": "https://www.youtube.com/watch?v=YvfWrC5prvU",
        "poster": "https://upload.wikimedia.org/wikipedia/en/5/5d/AKIRA_%281988_poster%29.jpg",
        "desc": "A secret military project endangers Neo-Tokyo when it turns a reckless biker gang member into a rampaging psionic psychopath who can only be stopped by his childhood friend."
      },
      {
        "t": "Ramayana: The Legend of Prince Rama",
        "p": "youtube",
        "y": "1992 · 2h 15m",
        "r": "9.3",
        "free": true,
        "ytId": "qv9z4rp375U",
        "stream": "https://www.youtube.com/watch?v=qv9z4rp375U",
        "poster": "https://img.youtube.com/vi/qv9z4rp375U/maxresdefault.jpg",
        "desc": "Prince Rama is exiled from Ayodhya and embarks on a sacred quest across ancient India with Lakshmana and Hanuman to rescue Sita from Ravana."
      },
      {
        "t": "Little Nemo: Adventures in Slumberland",
        "p": "youtube",
        "y": "1989 · 1h 25m",
        "r": "8.3",
        "free": true,
        "ytId": "wRs4Y3Kzdt0",
        "stream": "https://www.youtube.com/watch?v=wRs4Y3Kzdt0",
        "poster": "https://upload.wikimedia.org/wikipedia/en/e/eb/Little_Nemo_Adventures_in_Slumberland_poster.jpg",
        "desc": "A young boy journeys into the magnificent kingdom of Slumberland and must brave the menacing Nightmare King to rescue King Morpheus with the royal scepter."
      },

      {
            "t": "SPY \u00d7 FAMILY CODE: White",
            "p": "crunchyroll",
            "y": "2023 \u00b7 1h 50m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/b/be/Spy_%C3%97_Family_Code_White_poster.jpg",
            "desc": "While on a winter family trip, Anya accidentally swallows a piece of chocolate concealing a dangerous military microfilm, setting off a comedic geopolitical crisis. (Studio: Muse Hindi Dub)",
            "rightsRequired": true
      },

      {
            "t": "Assassination Classroom: 365 Days' Time",
            "p": "crunchyroll",
            "y": "2016 \u00b7 1h 32m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/4/4b/Ansatsu_Kyoushitsu_365_Nichi_no_Jikan.jpg",
            "desc": "Seven years after graduation, Nagisa Shiota and Karma Akabane return to their secluded Class 3-E schoolhouse on the hill to reminisce about their life lessons under Koro-sensei. (Studio: Muse Asia)",
            "rightsRequired": true
      },
      {
            "t": "Mobile Suit Gundam I",
            "p": "crunchyroll",
            "y": "1981 \u00b7 2h 17m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/5/52/Mobile_suit_gundam_movie_poster.jpg",
            "desc": "In Universal Century 0079, teenage civilian Amuro Ray accidentally climbs into the cockpit of the Earth Federation RX-78-2 Gundam to protect his colony from Zeon assault. (Studio: GUNDAM CHANNEL INTL)",
            "rightsRequired": true
      },
      {
            "t": "Mobile Suit Gundam II: Soldiers of Sorrow",
            "p": "crunchyroll",
            "y": "1981 \u00b7 2h 14m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/b/b8/Gundam_II_Soldiers_of_Sorrow_poster.jpg",
            "desc": "The crew of the Federation assault carrier White Base battles across Eurasian deserts against Zeon commander Ramba Ral and the lethal Black Tri-Stars. (Studio: GUNDAM CHANNEL INTL)",
            "rightsRequired": true
      },
      {
            "t": "Mobile Suit Gundam III: Encounters in Space",
            "p": "crunchyroll",
            "y": "1982 \u00b7 2h 21m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/4/4e/Gundam_III_Encounters_in_Space_poster.jpg",
            "desc": "The decisive battles of the One Year War unfold at Solomon and A Baoa Qu as Amuro Ray awakens as a Newtype and faces his nemesis Char Aznable. (Studio: GUNDAM CHANNEL INTL)",
            "rightsRequired": true
      },
      {
            "t": "Mobile Suit Gundam: Char's Counterattack",
            "p": "crunchyroll",
            "y": "1988 \u00b7 2h 00m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/d/d4/Char%27s_counterattack_poster.jpg",
            "desc": "Char Aznable resurfaces as supreme leader of Neo Zeon, dropping massive asteroid Fifth Luna onto Earth to trigger a nuclear winter, prompting Amuro Ray in the Nu Gundam to intercept. (Studio: GUNDAM CHANNEL INTL)",
            "rightsRequired": true
      },
      {
            "t": "Fairy Tail the Movie: Phoenix Priestess",
            "p": "crunchyroll",
            "y": "2012 \u00b7 1h 26m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/9/90/Fairy_Tail_the_Movie_Phoenix_Priestess_poster.jpg",
            "desc": "Lucy Heartfilia meets a mysterious girl named \u00c9clair who has lost her memories but carries the Phoenix Stone, drawing the guild into combat with the greedy prince of Veronica. (Studio: Muse Asia / Kodansha Official)",
            "rightsRequired": true
      },
      {
            "t": "Fairy Tail the Movie: Dragon Cry",
            "p": "crunchyroll",
            "y": "2017 \u00b7 1h 25m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/7/7b/Fairy_Tail_Dragon_Cry_poster.jpg",
            "desc": "Natsu and the Fairy Tail wizards infiltrate the fortified Stella Kingdom to reclaim the Dragon Cry, a sacred staff infused with the cataclysmic emotions of ancient dragons. (Studio: Muse Asia / Kodansha Official)",
            "rightsRequired": true
      },

      {
            "t": "Attack on Titan Part 2: Jiyuu no Tsubasa",
            "p": "crunchyroll",
            "y": "2015 \u00b7 2h 00m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/e/e2/Attack_on_Titan_Part_2_Wings_of_Freedom_poster.jpg",
            "desc": "Eren Yeager and Captain Levi lead the Scout Regiment into the Titan forest on the 57th Expedition, engaging in a deadly tactical game with the enigmatic Female Titan. (Studio: Muse Asia / Pony Canyon)",
            "rightsRequired": true
      },
      {
            "t": "Attack on Titan Season 2: Roar of Awakening",
            "p": "crunchyroll",
            "y": "2018 \u00b7 2h 01m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/3/30/Attack_on_Titan_Season_2_Roar_of_Awakening_poster.jpg",
            "desc": "Titans mysteriously appear within Wall Rose without any breach, revealing horrific secrets about Utgard Castle and the shocking betrayal of the Armored and Colossal Titans. (Studio: Muse Asia / Pony Canyon)",
            "rightsRequired": true
      },
      {
            "t": "Treasure Island",
            "p": "crunchyroll",
            "y": "1987 \u00b7 1h 28m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/1/1d/Takarajima_anime_film_poster.jpg",
            "desc": "Director Osamu Dezaki crafts a visually poetic cinematic adaptation of Robert Louis Stevenson classic, following Jim Hawkins and the charismatic rogue Long John Silver. (Studio: Anime! on TMS Official)",
            "rightsRequired": true
      },
      {
            "t": "The Mystical Laws",
            "p": "crunchyroll",
            "y": "2012 \u00b7 1h 59m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/en/6/69/The_Mystical_Laws_poster.jpg",
            "desc": "In a near-future world conquered by the high-tech Godom Empire wielding alien weaponry, a spiritual visionary awakens the ancient mystical laws of the cosmos to liberate humanity. (Studio: HS Pictures Studio)",
            "rightsRequired": true
      },
      {
            "t": "Neelkanth and the Dawn of Divine Destiny",
            "p": "crunchyroll",
            "y": "2020 \u00b7 1h 10m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/commons/4/4e/Neelkanth_Varni_Murti.jpg",
            "desc": "The awe-inspiring journey of 11-year-old child yogi Neelkanth Varni as he leaves his home in Ayodhya to travel 12,000 kilometers barefoot across the icy Himalayas and rainforests of India. (Studio: BAPS Media)",
            "rightsRequired": true
      },
      {
            "t": "Ghanshyam and the Storm of Evil",
            "p": "crunchyroll",
            "y": "2018 \u00b7 58m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/commons/7/7b/Swaminarayan_Chhapaiya.jpg",
            "desc": "Young child Ghanshyam protects the innocent residents of Chhapaiya village from malicious sorcerers and elemental demons through divine calm and supernatural strength. (Studio: Kids BAPS Official)",
            "rightsRequired": true
      },
      {
            "t": "Ghanshyam and the Miracles of Life",
            "p": "crunchyroll",
            "y": "2019 \u00b7 1h 02m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/commons/0/07/Swaminarayan_BAPS_Shri_Ghanshyam_Maharaj.jpg",
            "desc": "Heartwarming animated accounts of child Ghanshyam healing the sick, restoring life to suffering creatures, and preaching unconditional compassion across rural Awadh. (Studio: Kids BAPS Official)",
            "rightsRequired": true
      },
      {
            "t": "Ghanshyam and the Aura of Ayodhya",
            "p": "crunchyroll",
            "y": "2021 \u00b7 1h 05m",
            "r": "8.8",
            "poster": "https://upload.wikimedia.org/wikipedia/commons/5/5e/Ram_Mandir_Ayodhya_at_dusk.jpg",
            "desc": "Ghanshyam travels to the sacred riverbanks of Ayodhya, engaging venerable Sanskrit pandits in profound philosophical debates and displaying divine transcendence. (Studio: Kids BAPS Official)",
            "rightsRequired": true
      }
]
  },
  YouTube: {
    plats: ['youtube'],
    items: [
      { t: 'Lofi Hip Hop Radio', p: 'youtube', y: '24/7 Live Stream', r: '9.8', free: true, ytId: 'jfKfPfyJRdk', poster: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80' },
      { t: 'Universe in 4K', p: 'youtube', y: '1h 31m · Space Doc', r: '9.2', free: true, ytId: '5vuA3CSa0J4', poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' },
      { t: 'Kurzgesagt Space', p: 'youtube', y: '11m · Animation', r: '9.4', free: true, ytId: 'on2H8qt54Sub', poster: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80' },
      { t: 'Spring: CGI Film', p: 'youtube', y: '8m · 4K Open Film', r: '8.8', free: true, ytId: 'whfcsc7x0gI', poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  'Live TV': {
    plats: ['youtube', 'twitch', 'nbc'],
    items: [
      { t: 'NASA TV Live ISS', p: 'youtube', y: '24/7 Live Feed', r: '9.7', free: true, ytId: '21X5lGlDOfg', poster: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' },
      { t: 'Global News 24/7', p: 'youtube', y: 'Live Broadcast', r: '8.5', free: true, ytId: 'jfKfPfyJRdk', poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80' },
      { t: 'Lo‑fi Radio Ambient', p: 'youtube', y: 'Chill & Study', r: '9.8', free: true, ytId: 'jfKfPfyJRdk', poster: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  Sports: {
    plats: ['dazn', 'twitch', 'nbc', 'youtube'],
    items: [
      { t: 'Formula 1 Monaco GP', p: 'youtube', y: 'Highlights & Onboards', r: '9.1', free: true, ytId: 'jfKfPfyJRdk', poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80' },
      { t: 'Cricket Thrillers', p: 'youtube', y: 'Final Overs Highlights', r: '8.9', free: true, ytId: 'jfKfPfyJRdk', poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80' },
      { t: 'Fight Night Classics', p: 'dazn', y: 'Championship Bouts', r: '8.8', poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80' }
    ]
  }
};

const COLS = [
  ['#9a2a45', '#2a2a30'],
  ['#6b7078', '#5a1228'],
  ['#b04a2a', '#1f1a1c'],
  ['#7a1530', '#8b878c'],
  ['#4a6a8a', '#4a1228'],
  ['#c9a24a', '#3a1620'],
  ['#8a4a9a', '#1c1c22'],
  ['#c04060', '#303036']
];

const BG = [
  'linear-gradient(160deg,#7a1530,#1a0c12 70%)',
  'linear-gradient(180deg,#4a4a50,#09080a)',
  'radial-gradient(circle at 50% 30%,#b02347,#0a090b 70%)'
];

function getPlatformOfficialUrl(platformKey, title) {
  const p = (platformKey || '').toLowerCase();
  const t = encodeURIComponent(title || '');
  if (p === 'netflix') return t ? `https://www.netflix.com/search?q=${t}` : 'https://www.netflix.com';
  if (p === 'prime') return t ? `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${t}` : 'https://www.primevideo.com';
  if (p === 'hotstar' || p === 'disney') return 'https://www.hotstar.com';
  if (p === 'apple') return 'https://tv.apple.com';
  if (p === 'max') return 'https://www.max.com';
  if (p === 'hulu') return 'https://www.hulu.com';
  if (p === 'param') return 'https://www.paramountplus.com';
  if (p === 'crunchyroll') return t ? `https://www.crunchyroll.com/search?q=${t}` : 'https://www.crunchyroll.com';
  if (p === 'jiocinema') return 'https://www.jiocinema.com';
  if (p === 'tubi') return 'https://tubitv.com';
  if (p === 'archive') return 'https://archive.org';
  if (p === 'youtube') return t ? `https://www.youtube.com/results?search_query=${t}` : 'https://www.youtube.com';
  return `https://www.${p.replace(/[^a-z0-9]/g, '')}.com`;
}

export default function CoWatchCinemaHub({ onBackToHome }) {
  const { user, profile } = useAuth();
  const social = useSocial ? useSocial() : null;
  const friends = social?.friends || [];
  const displayName = profile?.displayName || profile?.display_name || profile?.username || (user?.isGuest ? 'Guest' : (user ? 'Member' : 'Guest'));
  const displayInitial = (displayName || 'J').charAt(0).toUpperCase();

  // 1. Hero State
  const [heroIndex, setHeroIndex] = useState(0);
  const heroTimerRef = useRef(null);
  const progKeyRef = useRef(0);

  // 2. Focus Carousel State
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHoveredStage, setIsHoveredStage] = useState(false);
  const carouselTimerRef = useRef(null);
  const pointerStartXRef = useRef(null);

  // 3. Category & Filter State
  const [activeCategory, setActiveCategory] = useState('Anime');
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 4. Modals State
  const [selectedDetailsContent, setSelectedDetailsContent] = useState(null);
  const [flashCardTarget, setFlashCardTarget] = useState(null);

  // 5. Room & Theater State
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [roomTitle, setRoomTitle] = useState('Party Room');
  const [roomPlatform, setRoomPlatform] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const [activeStreamUrl, setActiveStreamUrl] = useState(null);
  const [activeYouTubeId, setActiveYouTubeId] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteCode] = useState(() => Math.random().toString(36).slice(2, 8));

  // 6. Chat State & Centered Video Danmaku Toasts
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const msgsEndRef = useRef(null);
  const [danmakuToasts, setDanmakuToasts] = useState([]);

  // 7. Auto-Hide Video Controls & Fullscreen State
  const stageRef = useRef(null);
  const vwRef = useRef(null);
  const idleTimerRef = useRef(null);
  const isDraggingPointerRef = useRef(false);
  const isInputFocusedRef = useRef(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 8. Camera Deck State & Draggable Tile Coordinates
  const [camMode, setCamMode] = useState('studio'); // 'studio' | 'group' | 'separate' | 'merge'
  const [camSize, setCamSize] = useState(1); // 0 (S), 1 (M), 2 (L)
  const [camBgIndex, setCamBgIndex] = useState(0);
  const [camMinimized, setCamMinimized] = useState(false);
  const [camVisible, setCamVisible] = useState(true);
  const [cameraStream, setCameraStream] = useState(null);

  // Draggable panel coordinates (Group & Merge)
  const [camPanelPos, setCamPanelPos] = useState({ xPercent: 74, yPercent: 12 });
  // Draggable individual tile coordinates (Separate)
  const [soloPositions, setSoloPositions] = useState({
    [displayName]: { xPercent: 10, yPercent: 14 }
  });

  // Media Refs
  const videoRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide video controls timer
  const resetControlsTimeout = useCallback(() => {
    setAreControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!isDraggingPointerRef.current && !isInputFocusedRef.current) {
        setAreControlsVisible(false);
      }
    }, 2000);
  }, []);

  const handleStageActivity = () => {
    resetControlsTimeout();
  };

  // Toggle Fullscreen on video stage container
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Trigger centered floating Danmaku toast
  const triggerDanmakuToast = useCallback((sender, text, isMe) => {
    const toastId = Date.now() + Math.random();
    setDanmakuToasts((prev) => [...prev.slice(-2), { id: toastId, sender, text, isMe }]);
    setTimeout(() => {
      setDanmakuToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3800);
  }, []);

  // Auto Advance Hero
  useEffect(() => {
    heroTimerRef.current = setTimeout(() => {
      setHeroIndex((prev) => (prev + 1) % H.length);
      progKeyRef.current += 1;
    }, 6000);
    return () => clearTimeout(heroTimerRef.current);
  }, [heroIndex]);

  // Auto Advance Focus Carousel
  useEffect(() => {
    if (isHoveredStage || isRoomOpen) return;
    carouselTimerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % T.length);
    }, 3200);
    return () => clearInterval(carouselTimerRef.current);
  }, [isHoveredStage, isRoomOpen]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (msgsEndRef.current) {
      msgsEndRef.current.scrollTop = msgsEndRef.current.scrollHeight;
    }
  }, [chatMessages, isRoomOpen]);

  // Extract YouTube ID helper
  const getYouTubeId = (url) => {
    const m = (url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    return m ? m[1] : null;
  };

  // Stop all media
  const stopAllMedia = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
    }
    setActiveStreamUrl(null);
    setActiveYouTubeId(null);
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
  };

  // Open Room
  const openRoom = (title, platform = null, defaultUrl = null, ytId = null, push = true) => {
    setSelectedDetailsContent(null);
    setFlashCardTarget(null);
    if (push) {
      pushRoute({ tab: 'cinemaHub', category: activeCategory, platform: selectedPlatform, content: title, watchRoom: true });
    }
    stopAllMedia();
    setRoomTitle(title);
    setRoomPlatform(platform);
    setIsRoomOpen(true);
    document.body.style.overflow = 'hidden';
    resetControlsTimeout();

    // System message
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'sys',
        text: `${displayName} created party for ${title}`,
        isSys: true
      }
    ]);

    // Optional camera
    initCamera();

    // Stream playback
    if (ytId) {
      playUrl(`https://www.youtube.com/watch?v=${ytId}`);
    } else if (defaultUrl) {
      playUrl(defaultUrl);
    } else {
      const match = (MOVIE_CATALOG || []).find((m) => m.title.toLowerCase() === (title || '').toLowerCase());
      if (match && match.mediaUrl) {
        playUrl(match.mediaUrl);
      } else if (title.includes('Attack on Titan')) {
        playUrl('https://www.youtube.com/watch?v=AHT772bRkMY');
      } else if (title === 'Night of the Living Dead') {
        playUrl('https://archive.org/download/night_of_the_living_dead_ipod/night_of_the_living_dead.mp4');
      } else if (platform === 'youtube') {
        playUrl('https://www.youtube.com/watch?v=AHT772bRkMY');
      }
    }
  };

  // Close Room
  const closeRoom = (pushBack = true) => {
    stopAllMedia();
    setIsRoomOpen(false);
    document.body.style.overflow = '';
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (pushBack) {
      navigateBackSafe({ tab: 'cinemaHub', category: activeCategory, platform: selectedPlatform, content: selectedDetailsContent?.title });
    }
  };

  // Initialize Camera
  const initCamera = async () => {
    if (cameraStream) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(s);
    } catch (e) {
      console.warn('Camera access optional or not permitted');
    }
  };

  // Play URL
  const playUrl = (url) => {
    const u = (url || '').trim();
    if (!u) return;
    stopAllMedia();

    const yId = getYouTubeId(u);
    if (yId) {
      setActiveYouTubeId(yId);
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'sys', text: `${displayName} started YouTube playback`, isSys: true }
      ]);
    } else if (/^https?:\/\/\S+\.(mp4|webm|m3u8)/i.test(u) || u.startsWith('blob:')) {
      setActiveStreamUrl(u);
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'sys', text: `${displayName} started video stream`, isSys: true }
      ]);
    } else {
      alert('Please use a YouTube link or a direct .mp4/.webm video link.');
    }
  };

  // Handle Local File Upload
  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    stopAllMedia();
    const objectUrl = URL.createObjectURL(f);
    setActiveStreamUrl(objectUrl);
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'sys', text: `${displayName} opened file: ${f.name}`, isSys: true }
    ]);
  };

  // Handle Screen Sharing
  const handleScreenShare = async () => {
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stopAllMedia();
      screenStreamRef.current = s;
      setIsScreenSharing(true);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'sys', text: `${displayName} started sharing their screen`, isSys: true }
      ]);
      s.getVideoTracks()[0].onended = () => {
        stopAllMedia();
      };
    } catch (e) {
      console.warn('Screen share cancelled or failed');
    }
  };

  // Send Chat Message & Trigger Centered Danmaku
  const handleSendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: displayName,
        text,
        isMe: true,
        time: now
      }
    ]);
    triggerDanmakuToast(displayName, text, true);
    setChatInput('');

    // Natural companion reaction after 2.4s
    setTimeout(() => {
      const friend = Math.random() > 0.5 ? 'Aarav' : 'Meera';
      const replies = [
        'Great scene! 🍿',
        'Look at that cinematography!',
        'Audio sync is pristine here 🔥',
        'Love this part!'
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: friend, text: reply, isMe: false, time }
      ]);
      triggerDanmakuToast(friend, reply, false);
    }, 2400);
  };

  // Focus Carousel Navigation
  const goCarousel = (direction) => {
    const n = T.length;
    setActiveIndex((prev) => (prev + direction + n) % n);
  };

  // Category change
  const selectCategory = (k, push = true) => {
    setActiveCategory(k);
    setSelectedPlatform(null);
    if (push) {
      pushRoute({ tab: 'cinemaHub', category: k, platform: null });
    }
  };

  // Active Category Items with Search & Platform filtering
  const categoryItems = useMemo(() => {
    let raw = C[activeCategory]?.items || [];
    if (selectedPlatform) {
      raw = raw.filter((x) => x.p === selectedPlatform);
    }
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      raw = raw.filter((x) => x.t.toLowerCase().includes(query) || (N[x.p] || '').toLowerCase().includes(query));
    }
    return raw;
  }, [activeCategory, selectedPlatform, searchTerm]);

  // Handle Card Click
  const handleCardClick = (item, push = true) => {
    const isFree = item.free || item.p === 'tubi' || item.stream || item.ytId;
    const isYt = item.p === 'youtube' || item.ytId || (item.stream && item.stream.includes('youtube'));

    const contentObj = {
      title: item.t,
      year: item.y,
      rating: item.r,
      genre: activeCategory,
      poster: item.poster,
      providerName: N[item.p] || item.p,
      sourceType: isFree ? 'PUBLIC_DOMAIN' : isYt ? 'YOUTUBE' : 'EXTERNAL_PROVIDER',
      playbackMode: isFree ? 'NATIVE_PLAYER' : isYt ? 'YOUTUBE_PLAYER' : 'EXTERNAL_PROVIDER',
      videoStreamUrl: item.stream || item.ytId,
      description: item.desc || `${item.t} is available on ${N[item.p] || item.p}. Watch with friends in high definition.`,
      externalUrl: isFree ? item.stream : isYt ? `https://www.youtube.com/watch?v=${item.ytId}` : getPlatformOfficialUrl(item.p, item.t)
    };

    setSelectedDetailsContent(contentObj);
    if (push) {
      pushRoute({ tab: 'cinemaHub', category: activeCategory, platform: selectedPlatform, content: item.t });
    }
  };

  // Handle Card Play / Watch Together Trigger
  const handleWatchTogetherAction = (content) => {
    const isFree =
      content.sourceType === 'PUBLIC_DOMAIN' ||
      content.sourceType === 'OPEN_LICENSE' ||
      content.playbackMode === 'NATIVE_PLAYER' ||
      content.sourceType === 'YOUTUBE';

    if (isFree) {
      openRoom(content.title, content.providerName?.toLowerCase(), content.videoStreamUrl);
    } else {
      setFlashCardTarget({
        title: content.title,
        platform: content.providerName?.toLowerCase() || 'netflix',
        platformName: content.providerName || 'Platform'
      });
    }
  };

  // ── Drag & Drop for Standard Camera Deck (#cam) ──
  const panelDragDataRef = useRef({});

  const handlePanelPointerDown = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    e.stopPropagation();
    e.preventDefault();
    isDraggingPointerRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);

    const cRect = vwRef.current?.getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
    const pEl = document.getElementById('cam');
    const tRect = pEl ? pEl.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();

    panelDragDataRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      tileLeft: tRect.left - cRect.left,
      tileTop: tRect.top - cRect.top,
      cWidth: cRect.width,
      cHeight: cRect.height,
      tWidth: tRect.width,
      tHeight: tRect.height
    };
  };

  const handlePanelPointerMove = (e) => {
    if (!isDraggingPointerRef.current) return;
    const { pointerX, pointerY, tileLeft, tileTop, cWidth, cHeight, tWidth, tHeight } = panelDragDataRef.current;
    if (!cWidth || !cHeight) return;

    const deltaX = e.clientX - pointerX;
    const deltaY = e.clientY - pointerY;

    let newLeft = tileLeft + deltaX;
    let newTop = tileTop + deltaY;

    newLeft = Math.max(0, Math.min(newLeft, cWidth - tWidth));
    newTop = Math.max(0, Math.min(newTop, cHeight - tHeight));

    const xPercent = (newLeft / cWidth) * 100;
    const yPercent = (newTop / cHeight) * 100;

    setCamPanelPos({ xPercent, yPercent });
  };

  const handlePanelPointerUp = (e) => {
    if (isDraggingPointerRef.current) {
      isDraggingPointerRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // ── Drag & Drop for Separate Mode Participant Tiles ──
  const soloDragTargetRef = useRef(null);
  const soloDragInfoRef = useRef({});

  const handleTilePointerDown = (e, name) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingPointerRef.current = true;
    soloDragTargetRef.current = name;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    const cRect = vwRef.current?.getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
    const tRect = e.currentTarget.getBoundingClientRect();

    soloDragInfoRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      tileLeft: tRect.left - cRect.left,
      tileTop: tRect.top - cRect.top,
      cWidth: cRect.width,
      cHeight: cRect.height,
      tWidth: tRect.width,
      tHeight: tRect.height
    };
  };

  const handleTilePointerMove = (e, name) => {
    if (!isDraggingPointerRef.current || soloDragTargetRef.current !== name) return;
    const { pointerX, pointerY, tileLeft, tileTop, cWidth, cHeight, tWidth, tHeight } = soloDragInfoRef.current;

    const deltaX = e.clientX - pointerX;
    const deltaY = e.clientY - pointerY;

    let newLeft = tileLeft + deltaX;
    let newTop = tileTop + deltaY;

    newLeft = Math.max(0, Math.min(newLeft, cWidth - tWidth));
    newTop = Math.max(0, Math.min(newTop, cHeight - tHeight));

    const xPercent = (newLeft / cWidth) * 100;
    const yPercent = (newTop / cHeight) * 100;

    setSoloPositions((prev) => ({
      ...prev,
      [name]: { xPercent, yPercent }
    }));
  };

  const handleTilePointerUp = (e, name) => {
    if (soloDragTargetRef.current === name) {
      isDraggingPointerRef.current = false;
      soloDragTargetRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  // Participants for Camera deck (strictly real authenticated participants)
  const [remotePeers, setRemotePeers] = useState([]);

  // CoWatch route synchronization listener for browser Back/Forward navigation
  useEffect(() => {
    const handleRouteChange = (route) => {
      if (route.tab !== 'cinemaHub') return;

      if (route.category && route.category !== activeCategory) {
        setActiveCategory(route.category);
      }
      if (route.platform !== selectedPlatform) {
        setSelectedPlatform(route.platform || null);
      }

      // Handle Details Modal
      if (route.content) {
        if (!selectedDetailsContent || selectedDetailsContent.title !== route.content) {
          const allItems = Object.values(C).flatMap((cat) => cat.items || []);
          const matched = allItems.find((it) => it.t.toLowerCase() === route.content.toLowerCase());
          if (matched) {
            handleCardClick(matched, false);
          }
        }
      } else if (selectedDetailsContent && !route.watchRoom) {
        setSelectedDetailsContent(null);
      }

      // Handle Watch Room
      if (route.watchRoom) {
        if (!isRoomOpen) {
          openRoom(route.content || 'Party Room', null, null, null, false);
        }
      } else if (isRoomOpen) {
        closeRoom(false);
      }
    };

    const unsubscribe = subscribeToRoute(handleRouteChange);
    return () => unsubscribe();
  }, [activeCategory, selectedPlatform, selectedDetailsContent, isRoomOpen]);

  const participants = [
    { n: displayName, c: ['#9a2a45', '#2a2a30'], me: true, id: user?.id },
    ...remotePeers
  ];

  const currentHero = H[heroIndex];
  const camTileWidth = [110, 170, 240][camSize];

  return (
    <div className="cowatch-template-wrapper">
      {/* ── 1. SIDEBAR (#sb) ── */}
      <aside className="cw-sb" id="sb" aria-label="CoWatch Navigation">
        {/* Exit back to main CoGether */}
        <button
          type="button"
          className="cw-exit-btn"
          onClick={onBackToHome}
          title="Return to CoGether Home"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Exit CoGether</span>
        </button>

        <div className="cw-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          COWATCH
        </div>

        <a
          className={activeCategory === 'Movies' ? 'on' : ''}
          onClick={() => {
            selectCategory('Movies');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z" />
          </svg>
          <span>Home</span>
        </a>

        <a
          className={activeCategory === 'Free Movies' ? 'on' : ''}
          onClick={() => {
            selectCategory('Free Movies');
            const el = document.getElementById('cats');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4" />
          </svg>
          <span>Free movies</span>
        </a>

        <a
          className={activeCategory === 'Series' ? 'on' : ''}
          onClick={() => {
            selectCategory('Series');
            const el = document.getElementById('cats');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M3 6h18v12H3zM8 21h8" />
          </svg>
          <span>Series</span>
        </a>

        <a
          className={activeCategory === 'Anime' ? 'on' : ''}
          onClick={() => {
            selectCategory('Anime');
            const el = document.getElementById('cats');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" />
          </svg>
          <span>Anime</span>
        </a>

        <a
          className={activeCategory === 'YouTube' ? 'on' : ''}
          onClick={() => {
            selectCategory('YouTube');
            const el = document.getElementById('cats');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="2" y="4" width="20" height="16" rx="4" />
            <polygon points="10 9 15 12 10 15 10 9" />
          </svg>
          <span>YouTube</span>
        </a>

        <a
          className={activeCategory === 'Sports' ? 'on' : ''}
          onClick={() => {
            selectCategory('Sports');
            const el = document.getElementById('cats');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20M2 12h20" />
          </svg>
          <span>Sports</span>
        </a>

        <a
          className={activeCategory === 'Live TV' ? 'on' : ''}
          onClick={() => {
            selectCategory('Live TV');
            const el = document.getElementById('cats');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M5 12a7 7 0 0 1 14 0M8 12a4 4 0 0 1 8 0M12 12v8" />
          </svg>
          <span>Live TV</span>
        </a>

        <a
          onClick={() => {
            openRoom('Paste Link Room');
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1" />
          </svg>
          <span>Paste link</span>
        </a>

        <div className="cw-sec">LIVE ROOMS</div>
        <a onClick={() => openRoom('Night of the Living Dead', null, 'https://archive.org/download/night_of_the_living_dead_ipod/night_of_the_living_dead.mp4')}>
          <i />
          <span>Night of the Living Dead</span>
        </a>
        <a onClick={() => openRoom('Anime Marathon', 'crunchyroll')}>
          <i />
          <span>Anime marathon</span>
        </a>
        <a onClick={() => openRoom('NASA ISS Live', 'youtube', null, '21X5lGlDOfg')}>
          <i />
          <span>NASA ISS Live</span>
        </a>

        <div className="cw-usr">
          <b>{displayInitial}</b>
          <span>{displayName}</span>
        </div>
      </aside>

      {/* ── 2. TOP NAV (Fixed Header) ── */}
      <nav className="cw-nav">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <a
            onClick={() => {
              selectCategory('Free Movies');
              const el = document.getElementById('cats');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Free
          </a>
          <a
            onClick={() => {
              const el = document.getElementById('browse');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Browse
          </a>
          <a
            onClick={() => {
              selectCategory('Series');
              const el = document.getElementById('cats');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Series
          </a>
          <a
            onClick={() => {
              const el = document.getElementById('cats');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Categories
          </a>

          {/* Search bar */}
          <div className="cw-nav-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search cinema..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <button className="cw-btn" onClick={() => openRoom('Party Room')}>
          Start a party
        </button>
      </nav>

      {/* ── 3. MAIN SCROLLABLE CONTENT ── */}
      <div className="cw-main">
        {/* ── HERO SLIDER (.hero, #free) ── */}
        <header
          className="cw-hero"
          id="free"
          style={{ background: `linear-gradient(180deg, ${currentHero.bg}, #09080a)` }}
        >
          {H.map((h, i) => {
            const isOn = i === heroIndex;
            return (
              <div key={h.t} className={`cw-slide ${isOn ? 'on' : ''}`}>
                <div
                  className="cw-art"
                  style={{
                    background: `radial-gradient(circle at ${h.x}% ${h.y}%, ${h.a} 0, transparent 55%), radial-gradient(circle at ${100 - h.x}% 85%, ${h.b} 0, transparent 60%), linear-gradient(160deg, #241a20, #0a090b)`
                  }}
                >
                  {h.poster && (
                    <img
                      src={h.poster}
                      alt={h.t}
                      referrerPolicy="no-referrer"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }}
                    />
                  )}
                </div>
                <div className="cw-cap">
                  <span className="cw-tag">● {h.tag || "Free Stream"}</span>
                  <h1>{h.t}</h1>
                  <div className="cw-meta">
                    {h.m} <b>★★★★★</b>
                  </div>
                  <div className="cw-acts">
                    <button
                      className="cw-btn"
                      onClick={() => openRoom(h.t, h.platform || (h.ytId ? 'youtube' : null), h.stream, h.ytId)}
                    >
                      ▶ Watch free
                    </button>
                    <button
                      className="cw-btn ghost"
                      onClick={() => openRoom(h.t, h.platform || (h.ytId ? 'youtube' : null), h.stream, h.ytId)}
                    >
                      Watch together
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Numbered Thumbnail Strip */}
          <div className="cw-strip" id="strip">
            {H.map((h, i) => (
              <button
                key={h.t}
                className={i === heroIndex ? 'on' : ''}
                style={{ background: `linear-gradient(135deg, ${h.a}, ${h.b})` }}
                onClick={() => {
                  setHeroIndex(i);
                  progKeyRef.current += 1;
                }}
              >
                0{i + 1}
              </button>
            ))}
          </div>

          {/* Animated Progress Bar */}
          <div className="cw-prog">
            <i key={progKeyRef.current} className="go" />
          </div>
        </header>

        {/* ── FOCUS CAROUSEL SECTION (#browse) ── */}
        <section className="cw-section" id="browse">
          <div className="cw-head">
            <div>
              <h2>Trending right now</h2>
              <p>Swipe, click or let it glide across 8 cinematic highlights.</p>
            </div>
          </div>

          <div
            className="cw-stage"
            id="stage"
            onMouseEnter={() => setIsHoveredStage(true)}
            onMouseLeave={() => setIsHoveredStage(false)}
            onPointerDown={(e) => {
              pointerStartXRef.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if (pointerStartXRef.current !== null) {
                const diff = e.clientX - pointerStartXRef.current;
                if (Math.abs(diff) > 40) {
                  goCarousel(diff < 0 ? 1 : -1);
                }
                pointerStartXRef.current = null;
              }
            }}
          >
            <div className="cw-glow" />

            {T.map((m, i) => {
              const n = T.length;
              const d = ((i - activeIndex + n + n / 2) % n) - n / 2;
              const a = Math.abs(d);
              const isCenter = d === 0;
              const gap = typeof window !== 'undefined' && window.innerWidth < 700 ? 150 : 235;

              const transform = `translateX(${d * gap}px) scale(${isCenter ? 1.2 : 0.86 - a * 0.03})`;
              const opacity = a > 3 ? 0 : isCenter ? 1 : Math.max(0.15, 0.75 - a * 0.2);
              const filter = isCenter ? 'none' : `blur(${a * 1.5}px) brightness(.7)`;
              const zIndex = 10 - a;
              const pointerEvents = a > 3 ? 'none' : 'auto';

              return (
                <div
                  key={m.t}
                  className="cw-fc"
                  style={{ transform, opacity, filter, zIndex, pointerEvents }}
                  onClick={() => {
                    if (isCenter) {
                      handleCardClick(m);
                    } else {
                      setActiveIndex(i);
                    }
                  }}
                >
                  <div
                    className="cw-art"
                    style={{
                      background: `radial-gradient(circle at 60% 25%, ${m.a} 0, transparent 55%), radial-gradient(circle at 40% 85%, ${m.b} 0, transparent 60%), linear-gradient(160deg, #241a20, #0a090b)`
                    }}
                  >
                    {m.poster && (
                      <img
                        src={m.poster}
                        alt={m.t}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }}
                      />
                    )}
                  </div>
                  <div className="cw-pl">{renderLogo(m.p, 14)}</div>
                  <div className="cw-rt">{m.r} ★</div>
                  <div className="cw-tt">
                    <b>{m.t}</b>
                    <span>{m.y}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cw-nv">
            <button id="pv" aria-label="Previous" onClick={() => goCarousel(-1)}>
              ←
            </button>
            <button id="nx" aria-label="Next" onClick={() => goCarousel(1)}>
              →
            </button>
          </div>
        </section>

        {/* ── BROWSE BY CATEGORY SECTION (#cats) ── */}
        <section className="cw-section" id="cats">
          <div className="cw-head">
            <div>
              <h2>Browse by category</h2>
              <p>Pick a category, then a channel. Filter by streaming platform.</p>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="cw-tabs" id="tabs">
            {Object.keys(C).map((k) => (
              <button
                key={k}
                className={activeCategory === k ? 'on' : ''}
                onClick={() => selectCategory(k)}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Platform Chips (Horizontal Platform Filters) */}
          <div className="cw-plats" id="plats">
            {C[activeCategory]?.plats.map((p) => {
              const hex = L[p]?.h === '000000' || !L[p] ? 'e8e4e6' : L[p].h;
              const isSelected = selectedPlatform === p;
              return (
                <div
                  key={p}
                  className={`cw-plat ${isSelected ? 'on' : ''}`}
                  style={{ '--c': `#${hex}` }}
                  onClick={() => {
                    setSelectedPlatform(isSelected ? null : p);
                  }}
                >
                  {renderLogo(p, 22)}
                  <span>{N[p] || p}</span>
                </div>
              );
            })}
          </div>

          {/* Horizontal Card Row */}
          <div className="cw-row" id="row">
            {categoryItems.length > 0 ? (
              categoryItems.map((item, i) => {
                const title = item.t;
                const plat = item.p;
                const colPair = COLS[i % COLS.length];
                return (
                  <div
                    key={`${title}-${plat}-${i}`}
                    className="cw-c"
                    style={{ animationDelay: `${i * 70}ms` }}
                    onClick={() => handleCardClick(item)}
                  >
                    <div
                      className="cw-art"
                      style={{
                        background: `radial-gradient(circle at 65% 30%, ${colPair[0]} 0, transparent 55%), radial-gradient(circle at 35% 85%, ${colPair[1]} 0, transparent 60%), linear-gradient(160deg, #241a20, #0a090b)`
                      }}
                    >
                      {item.poster && (
                        <img
                          src={item.poster}
                          alt={title}
                          referrerPolicy="no-referrer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.88 }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>
                    <div className="cw-pl">{renderLogo(plat, 14)}</div>
                    {item.free && <span className="cw-c-free-badge">FREE</span>}
                    {item.r && <span className="cw-c-rating">★ {item.r}</span>}
                    <div className="cw-tt">
                      <b>{title}</b>
                      <span>{N[plat] || plat}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: 'var(--grey)', padding: '20px 4vw' }}>
                No titles matching {searchTerm ? `"${searchTerm}"` : 'this channel'}.
              </p>
            )}
          </div>
        </section>

        {/* ── POPULAR FREE MOVIES ROW (Public Domain Masters) ── */}
        <section className="cw-section" style={{ paddingTop: '20px' }}>
          <div className="cw-head">
            <div>
              <h2>Popular Free Movies</h2>
              <p>100% legal public domain & open-source cinema. Stream instantly with zero subscriptions.</p>
            </div>
          </div>
          <div className="cw-row">
            {PLATFORM_CATALOGS.FREE_MOVIES.map((m, i) => {
              const colPair = COLS[i % COLS.length];
              return (
                <div
                  key={m.id}
                  className="cw-c"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() =>
                    setSelectedDetailsContent({
                      title: m.title,
                      year: m.year,
                      runtime: m.runtime,
                      genre: m.genre,
                      rating: m.rating,
                      quality: m.quality,
                      poster: m.poster,
                      backdrop: m.backdrop,
                      description: m.description,
                      providerName: 'CoWatch Free Movies',
                      sourceType: m.sourceType,
                      playbackMode: m.playbackMode,
                      videoStreamUrl: m.videoStreamUrl
                    })
                  }
                >
                  <div
                    className="cw-art"
                    style={{
                      background: `radial-gradient(circle at 65% 30%, ${colPair[0]} 0, transparent 55%), radial-gradient(circle at 35% 85%, ${colPair[1]} 0, transparent 60%), linear-gradient(160deg, #241a20, #0a090b)`
                    }}
                  >
                    {m.poster && (
                      <img
                        src={m.poster}
                        alt={m.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }}
                      />
                    )}
                  </div>
                  <span className="cw-c-free-badge">FREE</span>
                  <span className="cw-c-rating">★ {m.rating}</span>
                  <div className="cw-tt">
                    <b>{m.title}</b>
                    <span>{m.year} · {m.genre}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── TRENDING YOUTUBE & WEB STREAMS ROW ── */}
        <section className="cw-section" style={{ paddingTop: '20px' }}>
          <div className="cw-head">
            <div>
              <h2>YouTube & Ambient Streams</h2>
              <p>Watch synchronized 4K documentaries, lofi chillout beats, and animation.</p>
            </div>
          </div>
          <div className="cw-row">
            {PLATFORM_CATALOGS.YOUTUBE.map((m, i) => {
              const colPair = COLS[(i + 3) % COLS.length];
              return (
                <div
                  key={m.id}
                  className="cw-c"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() =>
                    setSelectedDetailsContent({
                      title: m.title,
                      year: m.year,
                      runtime: m.runtime,
                      genre: m.genre,
                      rating: m.rating,
                      quality: m.quality,
                      poster: m.poster,
                      backdrop: m.backdrop,
                      description: m.description,
                      providerName: 'YouTube',
                      sourceType: 'YOUTUBE',
                      playbackMode: 'YOUTUBE_PLAYER',
                      videoStreamUrl: m.videoStreamUrl,
                      externalUrl: m.externalUrl
                    })
                  }
                >
                  <div
                    className="cw-art"
                    style={{
                      background: `radial-gradient(circle at 65% 30%, ${colPair[0]} 0, transparent 55%), radial-gradient(circle at 35% 85%, ${colPair[1]} 0, transparent 60%), linear-gradient(160deg, #241a20, #0a090b)`
                    }}
                  >
                    {m.poster && (
                      <img
                        src={m.poster}
                        alt={m.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }}
                      />
                    )}
                  </div>
                  <div className="cw-pl">{renderLogo('youtube', 14)}</div>
                  <span className="cw-c-rating">★ {m.rating}</span>
                  <div className="cw-tt">
                    <b>{m.title}</b>
                    <span>{m.runtime} · YouTube</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="cw-footer">
          CoWatch · Real public domain cinema, legal YouTube embeds, and subscriber extension sync.
        </footer>
      </div>

      {/* ── 4. FULL-SCREEN INTERACTIVE ROOM MODAL (#room) ── */}
      <div className={`cw-room ${isRoomOpen ? 'on' : ''}`} id="room">
        {/* Chat Rail */}
        <div className="cw-chat">
          <div className="cw-ch">
            <div>
              <b id="rt2">{roomTitle}</b>
              <small>● 3 online</small>
            </div>
            <button className="cw-btn" id="iv" onClick={() => setInviteOpen((prev) => !prev)}>
              + Invite
            </button>
          </div>

          {/* Invite Popup */}
          <div className={`cw-inv ${inviteOpen ? 'on' : ''}`} id="inv">
            <b style={{ font: "300 11px 'Outfit'", letterSpacing: '.3em' }}>INVITE FRIENDS</b>
            <code>cowatch.app/r/{inviteCode}</code>
            <button
              className="cw-btn"
              id="cp"
              style={{ padding: '7px 18px', fontSize: '13px' }}
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(`https://cowatch.app/r/${inviteCode}`);
                }
                setInviteCopied(true);
                setTimeout(() => setInviteCopied(false), 2000);
              }}
            >
              {inviteCopied ? 'Copied' : 'Copy link'}
            </button>
            {friends.length === 0 ? (
              <div style={{ color: '#888', fontSize: '12px', padding: '8px 0', textAlign: 'center' }}>
                No friends added yet. Share your party link to invite anyone!
              </div>
            ) : (
              friends.map((f) => {
                const friendName = f.displayName || f.username;
                return (
                  <div key={f.id || friendName} className="cw-fr">
                    <span>{friendName}</span>
                    <button
                      className="cw-btn ghost"
                      onClick={(e) => {
                        e.currentTarget.textContent = 'Invited';
                        setChatMessages((prev) => [
                          ...prev,
                          { id: Date.now(), sender: 'sys', text: `Invite sent to ${friendName}`, isSys: true }
                        ]);
                      }}
                    >
                      Invite
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Messages */}
          <div className="cw-msgs" id="ms" ref={msgsEndRef}>
            {chatMessages.map((m) => {
              if (m.isSys) {
                return (
                  <div key={m.id} className="cw-sys">
                    {m.text}
                  </div>
                );
              }
              return (
                <div key={m.id} className={`cw-m ${m.isMe ? 'me' : ''}`}>
                  {!m.isMe && (
                    <small style={{ color: m.sender === 'Aarav' ? '#6ea8d8' : '#d89a6e' }}>
                      {m.sender}
                    </small>
                  )}
                  <div>{m.text}</div>
                  <i>{m.time}</i>
                </div>
              );
            })}
          </div>

          {/* Chat Input */}
          <div className="cw-inp">
            <input
              id="mi"
              placeholder="Message"
              autoComplete="off"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
            />
            <button id="ms2" aria-label="Send" onClick={handleSendMessage}>
              ➤
            </button>
          </div>
        </div>

        {/* Video Stage with Auto-Hide Controls & Fullscreen Architecture */}
        <div
          ref={stageRef}
          className={`cw-sg ${!areControlsVisible ? 'mouse-idle' : ''}`}
          onMouseMove={handleStageActivity}
          onMouseEnter={handleStageActivity}
          onKeyDown={handleStageActivity}
        >
          {/* Top Player Toolbar (Auto-fades after 2s mouse inactivity) */}
          <div className={`cw-tb ${!areControlsVisible ? 'cw-tb-hidden' : ''}`}>
            <button className="cw-x" id="ex" aria-label="Exit" onClick={closeRoom}>
              ←
            </button>
            <span className="cw-lb" id="rt">
              {roomTitle}
            </span>
            <input
              type="text"
              id="lk"
              placeholder="Paste YouTube or video link"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onFocus={() => { isInputFocusedRef.current = true; setAreControlsVisible(true); }}
              onBlur={() => { isInputFocusedRef.current = false; resetControlsTimeout(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') playUrl(linkInput);
              }}
            />
            <button className="cw-btn" id="pl" onClick={() => playUrl(linkInput)}>
              Play
            </button>
            <label className="cw-btn ghost" htmlFor="fl">
              Open file
            </label>
            <input type="file" id="fl" accept="video/*" hidden onChange={handleFileChange} />
            <button className="cw-btn ghost" id="sh" onClick={handleScreenShare}>
              {isScreenSharing ? 'Stop sharing' : 'Share screen'}
            </button>
            <button
              type="button"
              className="cw-btn ghost"
              id="fs"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen (includes camera overlays)"}
            >
              {isFullscreen ? '⤢ Exit Fullscreen' : '⤡ Fullscreen'}
            </button>
            {!camVisible && (
              <button
                className="cw-btn ghost"
                id="co"
                onClick={() => {
                  setCamVisible(true);
                  initCamera();
                }}
              >
                Camera
              </button>
            )}
          </div>

          <div ref={vwRef} className="cw-vw">
            {/* HTML5 Native Player */}
            <video
              ref={videoRef}
              id="vid"
              controls
              playsInline
              autoPlay
              src={activeStreamUrl || undefined}
              style={{ display: activeStreamUrl || isScreenSharing ? 'block' : 'none' }}
            />

            {/* YouTube Player */}
            {activeYouTubeId && (
              <iframe
                id="yt"
                title="YouTube Video"
                src={`https://www.youtube.com/embed/${activeYouTubeId}?autoplay=1`}
                allow="autoplay; fullscreen"
                allowFullScreen
                style={{ display: 'block' }}
              />
            )}

            {/* Placeholder Text */}
            {!activeStreamUrl && !activeYouTubeId && !isScreenSharing && (
              <div className="cw-ph" id="ph">
                <div>
                  <b>{roomTitle}</b>
                  {!roomPlatform || roomPlatform === 'youtube' || roomPlatform === 'tubi' ? (
                    <>
                      Paste a YouTube link above or open a video file.
                      <br />
                      Everyone in the room watches together with real-time audio and video!
                    </>
                  ) : (
                    <>
                      {N[roomPlatform] || roomPlatform} streams are protected via DRM.
                      <br />
                      Press <strong>Share screen</strong> and pick the {N[roomPlatform] || roomPlatform} tab.
                      <br />
                      Or use the <strong>CoGether Extension</strong> to sync across your accounts!
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Centered Chat Message Overlay (Danmaku) */}
            <div className="cw-danmaku-container">
              {danmakuToasts.map((t) => (
                <div key={t.id} className="cw-danmaku-bubble">
                  <span className="cw-danmaku-sender">{t.sender}</span>
                  <span className="cw-danmaku-text">{t.text}</span>
                </div>
              ))}
            </div>

            {/* ── Virtual Studio Mode with Real Background Removal ── */}
            {camVisible && camMode === 'studio' && (
              <CinematicCameraOverlay
                participants={participants}
                cameraStream={cameraStream}
                containerRef={vwRef}
                areControlsVisible={areControlsVisible}
              />
            )}

            {/* ── Camera Deck (#cam): Mode Selector, Resize & Group/Merge Display ── */}
            {camVisible && (
              <div
                className={`cw-cam ${camMinimized ? 'min' : ''}`}
                id="cam"
                data-mode={camMode}
                style={{
                  '--tw': `${camTileWidth}px`,
                  left: `${camPanelPos.xPercent}%`,
                  top: `${camPanelPos.yPercent}%`,
                  right: 'auto'
                }}
              >
                <div
                  className="cw-chd"
                  onPointerDown={handlePanelPointerDown}
                  onPointerMove={handlePanelPointerMove}
                  onPointerUp={handlePanelPointerUp}
                  onPointerCancel={handlePanelPointerUp}
                >
                  <span className="cw-lb">⋮⋮ CAMERA</span>

                  {/* Mode switch */}
                  <div className="cw-pill" id="pm">
                    <button
                      data-m="studio"
                      className={camMode === 'studio' ? 'on' : ''}
                      onClick={() => setCamMode('studio')}
                      style={{ color: camMode === 'studio' ? '#fff' : '#4ade80' }}
                    >
                      ✨ Studio
                    </button>
                    <button
                      data-m="group"
                      className={camMode === 'group' ? 'on' : ''}
                      onClick={() => setCamMode('group')}
                    >
                      Group
                    </button>
                    <button
                      data-m="separate"
                      className={camMode === 'separate' ? 'on' : ''}
                      onClick={() => setCamMode('separate')}
                    >
                      Separate
                    </button>
                    <button
                      data-m="merge"
                      className={camMode === 'merge' ? 'on' : ''}
                      onClick={() => setCamMode('merge')}
                    >
                      Merge
                    </button>
                  </div>

                  {/* Size switch */}
                  <div className="cw-pill" id="ps">
                    <button
                      data-s="0"
                      className={camSize === 0 ? 'on' : ''}
                      onClick={() => setCamSize(0)}
                    >
                      S
                    </button>
                    <button
                      data-s="1"
                      className={camSize === 1 ? 'on' : ''}
                      onClick={() => setCamSize(1)}
                    >
                      M
                    </button>
                    <button
                      data-s="2"
                      className={camSize === 2 ? 'on' : ''}
                      onClick={() => setCamSize(2)}
                    >
                      L
                    </button>
                  </div>

                  {/* Minimize & Close */}
                  <button id="cc" title="Collapse" onClick={() => setCamMinimized((prev) => !prev)}>
                    {camMinimized ? '⌃' : '⌄'}
                  </button>
                  <button id="cx" title="Close" onClick={() => setCamVisible(false)}>
                    ✕
                  </button>
                </div>

                {/* Video Tiles Box */}
                <div id="cw-cb">
                  {camMode === 'group' && (
                    <div className="cw-grp">
                      {participants.map((p) => (
                        <div key={p.n} className="cw-tile">
                          {p.me && cameraStream ? (
                            <video
                              autoPlay
                              muted
                              playsInline
                              ref={(el) => {
                                if (el && el.srcObject !== cameraStream) el.srcObject = cameraStream;
                              }}
                            />
                          ) : (
                            <div
                              className="cw-av"
                              style={{ background: `linear-gradient(135deg, ${p.c[0]}, ${p.c[1]})` }}
                            >
                              {p.n[0]}
                            </div>
                          )}
                          <span className="cw-nm">{p.n}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {camMode === 'merge' && (
                    <div
                      className="cw-mg"
                      style={{ background: BG[camBgIndex] }}
                      title="Click to cycle gradient background"
                      onClick={() => setCamBgIndex((prev) => (prev + 1) % BG.length)}
                    >
                      {participants.map((p, i) => (
                        <div key={p.n} className="cw-cut" style={{ '--i': i }}>
                          <div className="cw-tile">
                            {p.me && cameraStream ? (
                              <video
                                autoPlay
                                muted
                                playsInline
                                ref={(el) => {
                                  if (el && el.srcObject !== cameraStream) el.srcObject = cameraStream;
                                }}
                              />
                            ) : (
                              <div
                                className="cw-av"
                                style={{ background: `linear-gradient(135deg, ${p.c[0]}, ${p.c[1]})` }}
                              >
                                {p.n[0]}
                              </div>
                            )}
                            <span className="cw-nm">{p.n}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Separate Mode: Individually Draggable Camera Tiles ── */}
            {camVisible &&
              camMode === 'separate' &&
              participants.map((p) => {
                const pos = soloPositions[p.n] || { xPercent: 78, yPercent: 20 };
                return (
                  <div
                    key={p.n}
                    className="cw-solo"
                    style={{
                      width: `${camTileWidth}px`,
                      left: `${pos.xPercent}%`,
                      top: `${pos.yPercent}%`
                    }}
                    onPointerDown={(e) => handleTilePointerDown(e, p.n)}
                    onPointerMove={(e) => handleTilePointerMove(e, p.n)}
                    onPointerUp={(e) => handleTilePointerUp(e, p.n)}
                    onPointerCancel={(e) => handleTilePointerUp(e, p.n)}
                  >
                    <div className="cw-solo-drag-handle">::: DRAG</div>
                    <div className="cw-tile">
                      {p.me && cameraStream ? (
                        <video
                          autoPlay
                          muted
                          playsInline
                          ref={(el) => {
                            if (el && el.srcObject !== cameraStream) el.srcObject = cameraStream;
                          }}
                        />
                      ) : (
                        <div
                          className="cw-av"
                          style={{ background: `linear-gradient(135deg, ${p.c[0]}, ${p.c[1]})` }}
                        >
                          {p.n[0]}
                        </div>
                      )}
                      <span className="cw-nm">{p.n}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── 6. CONTENT DETAILS MODAL ── */}
      <ContentDetailsModal
        isOpen={Boolean(selectedDetailsContent)}
        content={selectedDetailsContent}
        onClose={() => {
            setSelectedDetailsContent(null);
            navigateBackSafe({ tab: 'cinemaHub', category: activeCategory, platform: selectedPlatform });
          }}
        onPlayDirect={(c) => {
          openRoom(c.title, c.providerName?.toLowerCase(), c.videoStreamUrl);
        }}
        onWatchTogether={(c) => {
          handleWatchTogetherAction(c);
        }}
      />

      {/* ── 7. FLASH-CARD WATCH TOGETHER SETUP MODAL ── */}
      <WatchTogetherSetupModal
        isOpen={Boolean(flashCardTarget)}
        title={flashCardTarget?.title}
        platform={flashCardTarget?.platform}
        platformName={flashCardTarget?.platformName}
        onClose={() => setFlashCardTarget(null)}
        onStartCompanionRoom={() => {
          openRoom(`${flashCardTarget?.title} Party`, flashCardTarget?.platform);
        }}
        onStartScreenShare={() => {
          openRoom(`${flashCardTarget?.title} Stream`, flashCardTarget?.platform);
          setTimeout(() => {
            handleScreenShare();
          }, 300);
        }}
        onBrowseFree={() => {
          selectCategory('Free Movies');
          const el = document.getElementById('cats');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  );
}
