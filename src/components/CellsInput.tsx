import './cells-input.css';

type Props = {
  label: string;
} & React.PropsWithChildren;

export function CellsInput({ label, children }: Props) {
  return (
    <div className="cells-input">
      <div className="cells-input-item-wrapper">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
          <span className="cells-input-item" key={num} />
        ))}
        <span className="cells-input-text">{children}</span>
      </div>
      <label className="cells-input-label">{label}</label>
    </div>
  );
}
