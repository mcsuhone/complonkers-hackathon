# complonkers-hackathon

## Installation

1. Run `docker compose up -d --build` to begin development

## Slide Layout Schema

The `slide_layout_schema.xsd` now requires each `Text`, `Image`, `Chart`, and `List` element to have exactly one `<Content>` or `<Instructions>` child element, and must include a `mode` attribute with value `"content"` or `"instructions"` matching which one you use.
