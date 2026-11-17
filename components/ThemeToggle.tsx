"use client";
import { Icon } from "./Icon";

export function ThemeToggle() {
  function ganti() {
    const sekarang = document.documentElement.getAttribute("data-theme");
    const baru = sekarang === "terang" ? "gelap" : "terang";
    document.documentElement.setAttribute("data-theme", baru);
    try { localStorage.setItem("kk-tema", baru); } catch {}
  }

  return (
    <button type="button" className="circ theme-toggle" onClick={ganti} aria-label="Ganti tema gelap atau terang">
      <Icon name="sun" className="ic ic-sun" />
      <Icon name="moon" className="ic ic-moon" />
    </button>
  );
}
