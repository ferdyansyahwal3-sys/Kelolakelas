import Link from "next/link";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  title: string;
  eyebrow?: string;
  back?: string;
  icon?: string;
  chip?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, eyebrow, back, icon, chip, children }: Props) {
  return (
    <header className="phead">
      <div className="hrow">
        {back ? (
          <Link href={back} className="circ" aria-label="Kembali"><Icon name="back" /></Link>
        ) : icon ? (
          <span className="circ glow" aria-hidden="true"><Icon name={icon} /></span>
        ) : null}
        <div className="t">
          {eyebrow && <div className="label">{eyebrow}</div>}
          <h1 className="title">{title}</h1>
        </div>
        {children}
        <ThemeToggle />
      </div>
      {chip && <span className="pill"><span className="dot" />{chip}</span>}
    </header>
  );
}
