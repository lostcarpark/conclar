import { useState, useEffect } from "react";
import { useSpring, animated } from "react-spring";
import useMeasure from "react-use-measure";
import PropTypes from "prop-types";
import configData from "../config.json";

/**
 * Expand/collapse animated body of a programme item. Only mounted once an
 * item has actually been interacted with — useMeasure (a ResizeObserver) and
 * useSpring both allocate real objects per instance, which is wasted for the
 * large fraction of items a user never opens.
 */
export function ExpandableDetails({
  id,
  showExpanded,
  permaLink,
  people,
  tags,
  safeDesc,
  links,
}) {
  const [ref, bounds] = useMeasure();
  const [detailsVisible, setDetailsVisible] = useState(showExpanded);

  useEffect(() => {
    if (showExpanded) setDetailsVisible(true);
  }, [showExpanded]);

  const itemExpandedStyle = useSpring({
    height: showExpanded ? bounds.height : 0,
    display: "block",
    config: {
      tension: 300,
      friction: 15,
      clamp: true,
      ...configData.EXPAND.SPRING_CONFIG,
    },
    onRest: () => {
      if (!showExpanded) setDetailsVisible(false);
    },
  });

  if (!detailsVisible) return null;

  return (
    <animated.div
      className="item-details"
      style={itemExpandedStyle}
      id={"details-" + id}
      role="region"
      aria-labelledby={"header-" + id}
    >
      <div className="item-details-expanded" ref={ref}>
        {permaLink}
        <div className="item-people">
          <ul>{people}</ul>
        </div>
        <div className="item-tags">{tags}</div>
        <div
          className="item-description"
          dangerouslySetInnerHTML={{ __html: safeDesc }}
        />
        <div className="item-links">{links}</div>
      </div>
    </animated.div>
  );
}

ExpandableDetails.propTypes = {
  id: PropTypes.string,
  showExpanded: PropTypes.bool,
  permaLink: PropTypes.node,
  people: PropTypes.node,
  tags: PropTypes.node,
  safeDesc: PropTypes.string,
  links: PropTypes.node,
};
