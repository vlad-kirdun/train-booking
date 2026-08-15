/**
 * Renders structured data.
 *
 * `<` is escaped rather than emitted raw: the payload carries station names
 * that ultimately come from the API, and an unescaped `</script>` inside a
 * JSON-LD block ends the script element early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
