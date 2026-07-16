"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const KAABA = { lat: 21.422487, lng: 39.826206 };

function qiblaBearing(lat: number, lng: number) {
  const φ1 = (lat * Math.PI) / 180;
  const φ2 = (KAABA.lat * Math.PI) / 180;
  const Δλ = ((KAABA.lng - lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI + 360;
}

function cardinal(deg: number) {
  return ["U", "TL", "T", "TG", "S", "BD", "B", "BL"][Math.round(deg / 45) % 8];
}

export default function Home() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState(0);
  const [smoothHeading, setSmoothHeading] = useState(0);
  const [message, setMessage] = useState("Tekan butang di bawah untuk bermula");
  const [active, setActive] = useState(false);
  const [sensorActive, setSensorActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [dark, setDark] = useState(true);
  const watchId = useRef<number | null>(null);
  const targetHeading = useRef(0);
  const animatedHeading = useRef(0);

  const bearing = coords ? qiblaBearing(coords.lat, coords.lng) % 360 : 0;
  const startCompass = useCallback(async () => {
    setMessage("Mendapatkan lokasi anda…");
    if (!navigator.geolocation) {
      setMessage("Peranti ini tidak menyokong perkhidmatan lokasi.");
      return;
    }

    const Orientation = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    if (Orientation) {
      try {
        if (typeof Orientation.requestPermission === "function") {
          const permission = await Orientation.requestPermission();
          if (permission !== "granted") throw new Error("orientation denied");
        }
        setListening(true);
      } catch {
        setMessage("Akses kompas disekat. Benarkan Motion & Orientation Access dan cuba lagi.");
        return;
      }
    } else {
      setMessage("Mendapatkan lokasi… Peranti ini mungkin tiada sensor kompas.");
    }

    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setActive(true);
        setMessage(Orientation
          ? "Lokasi aktif • Gerakkan telefon membentuk angka 8 untuk kalibrasi"
          : "Lokasi aktif, tetapi sensor kompas tidak tersedia pada peranti ini.");
      },
      () => setMessage("Lokasi tidak dapat dikesan. Benarkan akses lokasi dan cuba lagi."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  }, []);

  useEffect(() => {
    if (!listening) return;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const iosHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      const screenAngle = window.screen.orientation?.angle ?? (window.orientation as number | undefined) ?? 0;
      const next = typeof iosHeading === "number"
        ? iosHeading
        : event.alpha == null ? null : 360 - event.alpha + screenAngle;
      if (next != null && Number.isFinite(next)) {
        const normalized = (next + 360) % 360;
        targetHeading.current = normalized;
        setHeading(normalized);
        setSensorActive(true);
        setMessage("Kompas aktif • Jauhkan telefon daripada objek bermagnet");
      }
    };
    window.addEventListener("deviceorientationabsolute", onOrientation as EventListener, true);
    window.addEventListener("deviceorientation", onOrientation, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrientation as EventListener, true);
      window.removeEventListener("deviceorientation", onOrientation, true);
    };
  }, [listening]);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      const current = animatedHeading.current;
      const delta = ((targetHeading.current - current + 540) % 360) - 180;
      animatedHeading.current = (current + delta * 0.1 + 360) % 360;
      setSmoothHeading(animatedHeading.current);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  return (
    <main className={dark ? "simple-app dark" : "simple-app"}>
      <header className="simple-header"><a className="brand" href="#top"><span className="brand-mark">◆</span><span>KIBLAT<span className="brand-dot">.</span></span></a><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Tukar tema">{dark ? "☼" : "☾"}</button></header>
      <section className="compass-screen" id="top">
        <div className="intro"><span className="overline">KOMPAS KIBLAT DALAM TALIAN</span><h1>Cari arah <em>Kiblat.</em></h1><p>Letakkan telefon secara mendatar, kemudian pusing perlahan-lahan.</p></div>
        <div className="compass-shell" aria-label={`Arah kiblat ${bearing.toFixed(0)} darjah`}>
          <div className="outer-ring" /><div className="orbit orbit-one" />
          <div className="compass" style={{ transform: `rotate(${-smoothHeading}deg)` }}>
            {Array.from({ length: 72 }).map((_, i) => <i key={i} className={i % 9 === 0 ? "tick major" : "tick"} style={{ transform: `rotate(${i * 5}deg)` }} />)}
            <span className="direction north">U</span><span className="direction east">T</span><span className="direction south">S</span><span className="direction west">B</span>
            <div className="qibla-arrow" style={{ transform: `rotate(${bearing}deg)` }}><span className="kaaba"><b /></span><i /></div>
          </div>
          <div className="needle" aria-hidden="true"><span /><i /></div>
          <div className="compass-center"><small>ARAH KIBLAT</small><strong>{coords ? `${bearing.toFixed(0)}°` : "—°"}</strong><span>{coords ? cardinal(bearing) : "MENUNGGU"}</span></div>
        </div>
        <button className="start-button" onClick={startCompass}><span>⌖</span>{active ? "Kemas kini lokasi" : "Gunakan lokasi saya"}</button>
        <div className="sensor-message"><span className={sensorActive ? "live-dot active" : "live-dot"} />{message}</div>
      </section>
      <section className="readings" aria-label="Bacaan kompas">
        <article><span>ARAH KOMPAS</span><strong>{sensorActive ? `${heading.toFixed(0)}° ${cardinal(heading)}` : "—"}</strong></article>
        <article><span>ARAH KIBLAT</span><strong className="gold">{coords ? `${bearing.toFixed(0)}° ${cardinal(bearing)}` : "—"}</strong></article>
        <article><span>LATITUD</span><strong>{coords ? coords.lat.toFixed(5) : "—"}</strong></article>
        <article><span>LONGITUD</span><strong>{coords ? coords.lng.toFixed(5) : "—"}</strong></article>
      </section>
      <footer className="simple-footer"><p>Untuk ketepatan terbaik, gerakkan telefon membentuk angka 8 dan jauhkan daripada magnet.</p><span>© 2026 KIBLAT.</span></footer>
    </main>
  );
}
