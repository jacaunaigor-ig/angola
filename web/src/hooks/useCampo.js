import { useEffect, useState } from "react";
import { gravarCampo, lerCampo } from "../campanha.js";

export function useCampo() {
  const [campo, setCampo] = useState(lerCampo);

  useEffect(() => {
    const sync = () => setCampo(lerCampo());
    window.addEventListener("warroom-campo", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("warroom-campo", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function actualizar(seguinte) {
    gravarCampo(seguinte);
    setCampo(seguinte);
  }

  return [campo, actualizar];
}
