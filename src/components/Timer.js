import { useEffect } from "react";
import { useStoreState, useStoreActions } from "easy-peasy";

const Timer = ({ tick }) => {
  const timeToNextFetch = useStoreState((state) => state.timeToNextFetch);
  const updateTimeSinceLastFetch = useStoreActions(
    (action) => action.updateTimeSinceLastFetch
  );
  const onLine = useStoreState((state) => state.onLine);
  const setOnLine = useStoreActions((action) => action.setOnLine);
  const fetchProgram = useStoreActions((actions) => actions.fetchProgram);

  useEffect(() => {
    // Create JavaScript interval timer.
    let timer = setInterval(() => {
      updateTimeSinceLastFetch();
      setOnLine(window.navigator.onLine);

      if (onLine && timeToNextFetch <= 0) {
        fetchProgram();
      }
    }, tick * 1000);

    // Clean-up, called when component shuts down.
    return () => {
      clearInterval(timer);
    };
  });

  return <></>;
};

export default Timer;
