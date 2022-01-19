import { useLocation } from "react-router-dom";
export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <div className="error">
      The page <span>{pathname}</span> was not found.
    </div>
  );
}
