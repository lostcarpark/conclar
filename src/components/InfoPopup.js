import { useRef, useEffect, useState } from "react";
import { IoChevronDownCircle } from "react-icons/io5";

const InfoPopup = ({
  isOpen,
  graphic,
  heading,
  title,
  details,
  detailsLabel,
  primaryAction,
  dismissLabel,
  onDismiss,
}) => {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const dialogRef = useRef(null);
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = dialog.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onDismissRef.current();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="info-popup-overlay">
      <div
        className="info-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby={heading ? "info-popup-heading" : "info-popup-title"}
        ref={dialogRef}
      >
        {heading && (
          <>
            <h2 id="info-popup-heading" className="info-popup-heading">
              {heading}
            </h2>
            <hr className="info-popup-divider" />
          </>
        )}
        <p id="info-popup-title" className="info-popup-title">
          {title}
        </p>
        {graphic && <div className="info-popup-graphic">{graphic}</div>}
        {details && (
          <div className="info-popup-details">
            <button
              aria-expanded={detailsExpanded}
              className="info-popup-details-toggle"
              onClick={() => setDetailsExpanded(!detailsExpanded)}
            >
              {detailsLabel}
              <IoChevronDownCircle
                className="info-popup-details-chevron"
                style={{ transform: detailsExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                aria-hidden="true"
              />
            </button>
            {detailsExpanded && (
              <div className="info-popup-details-content">{details}</div>
            )}
          </div>
        )}
        <hr className="info-popup-divider" />
        <div className="info-popup-actions">
          {primaryAction && (
            <a href={primaryAction.href} className="info-popup-primary">
              {primaryAction.label}
            </a>
          )}
          <button className="info-popup-dismiss" onClick={() => onDismissRef.current()}>
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoPopup;
