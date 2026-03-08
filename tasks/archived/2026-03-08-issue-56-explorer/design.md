# Issue 56 Design Notes

## Data Source
- Derive `Changed` entries from the existing workspace tree by flattening file nodes whose Git status is not clean.
- Use full file paths in the `Changed` section and keep the hierarchical tree below it.

## Interaction Model
- `Changed` rows are direct file shortcuts.
- Explorer rows keep the existing collapse/expand behavior for directories.
- Selected file state is shared between the changed section and the explorer rows.

## Presentation
- Replace the current rounded-card file rows with compact list rows.
- Use muted path secondary text in `Changed`.
- Render compact status text such as `M` or `??` aligned to the right.

## Review Result
- Pass. This stays within current data contracts and layers naturally onto the issue #55 inspect flow.
