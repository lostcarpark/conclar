import { useStoreState } from "easy-peasy";
import configData from "../config.json";
import { isSyncEnabled } from "../SyncService";

const syncConfig = configData.SYNC || {};

const UserStatus = () => {
  const userProfile = useStoreState((state) => state.userProfile);

  if (!isSyncEnabled()) {
    return null;
  }

  if (!userProfile) {
    return (
      <li>
        <a className="disabled" aria-disabled="true">
          {syncConfig.LOADING_LABEL || "Loading..."}
        </a>
      </li>
    );
  }

  if (userProfile.error) {
    const errorMessage = syncConfig.ERROR_LABEL || "Could not connect to sync server";
    return (
      <li>
        <a className="disabled" aria-disabled="true"
           role="alert"
           title={errorMessage}
           aria-label={errorMessage}>
          <span aria-hidden="true">⚠ </span>
          {syncConfig.LOGIN_LABEL || "Log in"}
        </a>
      </li>
    );
  }

  if (userProfile.authenticated) {
    const MAX_NAME_LENGTH = 20;
    const displayName =
      userProfile.display_name.length > MAX_NAME_LENGTH
        ? userProfile.display_name.slice(0, MAX_NAME_LENGTH) + "\u2026"
        : userProfile.display_name;
    const label = (syncConfig.LOGOUT_LABEL || "Log out @display_name").replace(
      "@display_name",
      displayName
    );
    return (
      <li>
        <a href={userProfile.logout_url}>{label}</a>
      </li>
    );
  }

  return (
    <li>
      <a href={userProfile.login_url}>
        {syncConfig.LOGIN_LABEL || "Log in"}
      </a>
    </li>
  );
};

export default UserStatus;
