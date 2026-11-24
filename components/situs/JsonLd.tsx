/** Data terstruktur untuk mesin pencari. Karakter "<" di-escape supaya tidak bisa menutup tag script. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
