---
status: DONE
updateDate: 2026-05-27
priority: Medium
---

# Highlight & Alert

## Overview

Custom inline markdown syntax for highlighting and alert callouts using `=text=` and `!text!` markers, with three intensity variants per family (single, double, triple).

| Markup | Style |
|---|---|
| `=text=` | solid yellow background, theme-default foreground |
| `==text==` | yellow foreground (`#B58900`), no background, not bold |
| `===text===` | yellow foreground (`#B58900`), no background, **bold** |
| `!text!` | solid red background, white foreground for contrast |
| `!!text!!` | red foreground (`#DC322F`), no background, not bold |
| `!!!text!!!` | red foreground (`#DC322F`), no background, **bold** |

## Implementation

- Detected by `processHighlightInSlice` and `processAlertInSlice` in `src/parser/highlight-alert.ts`, invoked from `processTextNode` over each remark Text node value.
- Flanking rules (CommonMark-style): a marker is treated as syntax only when it is NOT adjacent to a word character (`[A-Za-z0-9_]`) or another copy of itself on its outer side, and the content immediately inside the markers is non-whitespace.
- Triple → double → single match order; the longest matching marker wins (consumed ranges block shorter overlaps).
- Single-marker variants use transparent markers + full-range background (markers stay in layout so the bg spans the whole span). Double and triple variants hide markers with `display: none`.
- Colors are configurable via `markdownInlineEditor.colors.{highlight,highlightBackground,highlightSingleForeground,alert,alertBackground,alertSingleForeground}`.
- TextMate grammar injection in `syntaxes/markdown-highlight.tmLanguage.json` provides token scopes for theme styling alongside the decoration types.

## Acceptance Criteria

```gherkin
Feature: Highlight & Alert flanking rules

  Scenario: Solid-bg highlight
    When I type =word=
    Then the span is decorated with yellow background
    And the markers are invisible

  Scenario: Foreground highlight
    When I type ==important==
    Then the content is colored yellow without background

  Scenario: Bold highlight
    When I type ===critical===
    Then the content is colored yellow, bold, without background

  Scenario: Solid-bg alert
    When I type !word!
    Then the span has a red background and white foreground

  Scenario: Bold alert
    When I type !!!danger!!!
    Then the content is colored red and bold

  Scenario: Assignment is not highlighted
    When I type flag=true
    Then no decoration is applied

  Scenario: Not-equal is not an alert
    When I type x != 5
    Then no decoration is applied

  Scenario: Identifier with embedded markers
    When I type a=b=c
    Then no decoration is applied

  Scenario: Whitespace inside markers
    When I type = bad= or !bad !
    Then no decoration is applied
```

## Notes

- Open this file with the extension active to visually verify all variants behave as the table describes.
- If any "should NOT match" example is rendered as a highlight/alert, the flanking rules have regressed.
- If any "should match" example fails to render, the rules have become too strict.

## Examples

### Highlight — should match

- Solid-bg form: `=word=`
- Solid-bg with punctuation: Look at =this=.
- Solid-bg inside parens: (=test=)
- Solid-bg with internal spaces: =foo bar=
- Two solid-bg spans: =one= and =two= on the same line
- Solid-bg trailing punctuation: =alpha=,
- Foreground form: ==important==
- Foreground with spaces: ==foo bar baz==
- Bold form: ===critical===
- Bold with spaces: ===foo bar baz===
- Solid-bg inside brackets: [=note=] and {=tag=}
- Bold followed by punctuation: ===emphasis===.

### Highlight — should NOT match

- Solid-bg inside identifier: a=b=c
- Assignment-like: flag=true, x=5
- Two assignments: result=foo and key=bar
- Solid-bg closer next to letter: =word=word
- Leading whitespace inside markers: = bad=
- Trailing whitespace inside markers: =bad =
- Foreground form inside identifier: a==b==c
- Bold form inside identifier: a===b===c
- Bold closer next to letter: ===word===word
- Equality comparison: if (count == limit)

### Alert — should match

- Solid-bg form: `!word!`
- Solid-bg: !important!
- Solid-bg with punctuation: Note: !critical!.
- Solid-bg wrapped: (!warning!)
- Foreground form: !!stop!!
- Foreground with spaces: !!do not enter!!
- Bold form: !!!danger!!!
- Bold with spaces: !!!do not enter!!!
- Bold followed by punctuation: Status: !!!critical!!!.
- Multiple solid-bg: !one! and !two!

### Alert — should NOT match

- Exclamation in prose: Wow! Yes!
- Not-equal operator: x != 5
- Leading whitespace: ! bad!
- Trailing whitespace: !bad !
- Solid-bg closer next to letter: !word!word
- Foreground form adjacent to letter: a!!b!!c
- Bold form adjacent to letter: a!!!b!!!c
- Bold closer next to letter: !!!word!!!word

### Mixed and edge cases

- Solid-bg pair on one line: =highlighted= and !alerted! together.
- Foreground pair: ==yellow text== with !!red text!!
- Bold pair: ===bold yellow=== with !!!bold red!!!
- All highlight variants: =one= ==two== ===three===
- All alert variants: !a! !!b!! !!!c!!!
- Punctuation boundaries: end of sentence =wraps=. New sentence.
- Nested-looking but flat: (=outer=) [!inner!]
- Solid-bg in quoted phrase: "=quoted=" and '=single='
- Solid-bg at start and end of line: =edge=
- Foreground in quoted phrase: "==quoted==" and '==single=='
- Bold in quoted phrase: "===quoted===" and '===single==='
