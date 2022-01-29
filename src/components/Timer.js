import { useEffect } from "react";
import { useStoreActions } from "easy-peasy";

const Timer = ({ tick }) => {
  const setOnLine = useStoreActions((action) => action.setOnLine);

  useEffect(() => {
    let timer = setInterval(() => {
      setOnLine(window.navigator.onLine);
    }, tick * 1000);
    return () => {
      clearInterval(timer);
    };
  });

  return <></>;
};

export default Timer;
