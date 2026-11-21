"use strict";

const gameFrame = document.querySelector("main");
const fullscreenButton = document.querySelector("#fullscreen");

function syncFullscreenButton() {
  const expanded = document.fullscreenElement === gameFrame
    || document.documentElement.classList.contains("game-expanded");
  fullscreenButton.textContent = expanded ? "Exit full screen" : "Full screen";
  fullscreenButton.setAttribute("aria-pressed", String(expanded));
}

fullscreenButton.addEventListener("click", async () => {
  if (document.fullscreenElement === gameFrame) {
    await document.exitFullscreen();
    return;
  }
  if (document.documentElement.classList.contains("game-expanded")) {
    document.documentElement.classList.remove("game-expanded");
  } else {
    if (gameFrame.requestFullscreen) {
      try {
        await gameFrame.requestFullscreen();
        return;
      } catch {
        // Some mobile browsers and embedded pages only allow in-page expansion.
      }
    }
    document.documentElement.classList.add("game-expanded");
  }
  syncFullscreenButton();
});

document.addEventListener("fullscreenchange", syncFullscreenButton);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !document.querySelector("dialog[open]") && document.documentElement.classList.contains("game-expanded")) {
    document.documentElement.classList.remove("game-expanded");
    syncFullscreenButton();
  }
});
