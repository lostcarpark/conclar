const Switch = ({ id, label, checked, onChange }) => (
  <div class="switch-wrapper">
    <button
      className="switch"
      id={id}
      name={id}
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => onChange(!checked)}
    >
      {label}
    </button>
  </div>
);

export default Switch;
