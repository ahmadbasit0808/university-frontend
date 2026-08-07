import { useEffect } from "react";

export default function Toast({ message, type = "success", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return <div className={`toast toast-${type}`}>{message}</div>;
}
