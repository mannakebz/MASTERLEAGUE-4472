export function CardStats({ yellow, red }: { yellow: number; red: number }) {
  return (
    <div className="card-stats">
      <span aria-label={`${yellow} yellow cards`}>
        <i className="yellow-card" />
        {yellow}
        <small>YC</small>
      </span>
      <span aria-label={`${red} red cards`}>
        <i className="red-card" />
        {red}
        <small>RC</small>
      </span>
    </div>
  );
}
