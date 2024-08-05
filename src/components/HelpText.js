import { useStoreState, useStoreActions } from "easy-peasy";
import configData from "../config.json";

const HelpText = () => {
  const mySchedule = useStoreState((state) => state.getMySchedule);
  const helpTextDismissed = useStoreState((state) => state.helpTextDismissed);
  const setHelpTextDismissed = useStoreActions(
    (actions) => actions.setHelpTextDismissed
  );
  const dismiss = (item) => {
    setHelpTextDismissed({ ...helpTextDismissed, [item]: true });
  };
  const selector = mySchedule.length > 0 ? "SHARING" : "WELCOME";
  console.log(selector);
  console.log(helpTextDismissed);
  if (selector in helpTextDismissed && helpTextDismissed[selector]) {
    return <></>;
  }
  const text = configData.HELP_TEXT[selector];
  return (
    <div className="help-text">
      <button
        onClick={() => dismiss(selector)}
        aria-label={configData.HELP_TEXT.CLOSE_ARIA_LABEL}
      >
        {configData.HELP_TEXT.CLOSE_LABEL}
      </button>
      {text}
    </div>
  );
};

export default HelpText;
