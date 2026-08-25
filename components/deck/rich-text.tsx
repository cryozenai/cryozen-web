import { Fragment, type ReactNode } from "react";

/*
 * Two inline markers, and deliberately only two.
 *
 *   **strong**  the white-hot core weight, for the words a reader must land on
 *   ==accent==  the cyan phrase in a headline
 *
 * Deck copy is prose written by a founder, not markup, so the marker set has to
 * be one nothing in the copy can produce by accident. A single `~` was the
 * obvious choice and is exactly wrong: the decks use it as "approximately"
 * ("~$16M ARR", "Datadog ~120%"), and one unpaired tilde would have swallowed
 * the rest of a sentence into an accent span. `==` cannot occur in prose.
 */
const TOKEN = /(\*\*[^*]+\*\*|==[^=]+==)/g;

export function RichText({ text }: { text: string }): ReactNode {
  return text.split(TOKEN).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-core">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("==") && part.endsWith("==")) {
      return (
        <span key={index} className="text-primary">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** The same markers, flattened, for `<title>` and meta descriptions. */
export function plainText(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/==([^=]+)==/g, "$1");
}
