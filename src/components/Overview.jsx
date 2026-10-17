export default function Overview({ text, hidden }) {
  return hidden ? <details className="spoiler-overview"><summary>Reveal overview</summary><p className="overview">{text}</p></details> : <p className="overview">{text}</p>
}
