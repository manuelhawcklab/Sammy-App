import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initPWA } from "./lib/pwa";

initPWA();

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* el SW es opcional; la app funciona igual */
    });
  });
}
