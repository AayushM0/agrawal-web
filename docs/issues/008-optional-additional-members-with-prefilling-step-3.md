## What to build

Redesign Step 3 of the registration wizard to **"Additional Family Members (Optional) • अन्य परिवार के सदस्य (वैकल्पिक)"**.

- Adding extra family members is completely **optional** (users registering alone can skip directly to Review & Submit).
- If the user clicks "+ Add Family Member", the form presents full member detail inputs matching the Head's fields (Photo, Name, Relation, Father Name, DOB, Gender, Marital Status, Profession, Optional Phone/Email for claiming, Address, and Country IDs).
- **Smart Inheritance & Prefilling**: Automatically prefill shared household values from the Head (Country, State, City, Postal Code, Full Address, Ancestral Native Place, Gotra) when a new member card is added, while allowing per-member edits.
- Users can remove any added family member cards.

## Acceptance criteria

- [ ] Step 3 title indicates adding additional members is optional
- [ ] "Skip & Proceed to Review" or direct "Continue to Review" CTA allows progressing with 0 additional members (Head only)
- [ ] "+ Add Family Member" opens a card with full fields matching Head specifications
- [ ] Newly added members automatically inherit common address, gotra, and native place from Step 2 Head values
- [ ] Optional claiming phone/email fields for family members are clearly indicated
- [ ] Bottom CTA lets users remove or add more members

## Blocked by

- docs/issues/007-consolidate-head-and-family-details-step-2.md
