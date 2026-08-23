## What to build

Consolidate Step 2 of the registration wizard from "Gotra & Native Place" into **"Head & Family Details"**. 

This step will capture all mandatory and primary identification details for the Head of Household in a single structured view before proceeding to additional members:
- **Head Profile Photo** (with preview & upload)
- **Head Full Name** & **Father's Name (पिता का नाम)**
- **Date of Birth** (with live age calculation badge)
- **Gender & Marital Status**
- **Profession Title & 1-line Description** (with example hint)
- **Ancestral Gotra** (18 Gotras selector) & **Ancestral Native Place** (मूल निवास)
- **5-Tier Cascading Residential Address** (Country -> Postal Code -> State -> City -> Full Address)
- **Country-Specific Government Identity** (Aadhaar & PAN for India; Passport & Govt ID for International)

## Acceptance criteria

- [ ] Wizard Step 2 is titled "Head & Family Details • मुखिया एवं परिवार विवरण"
- [ ] All primary Head attributes (Name, Photo, Father's Name, DOB, Age, Gender, Marital Status, Profession, Gotra, Native Place, 5-Tier Address, Country IDs) are captured in Step 2
- [ ] Live age calculation displays directly under Date of Birth
- [ ] Validations run on Step 2 submission before advancing to Step 3
- [ ] Step 2 data cleanly populates the primary member `members[0]` and household data models

## Blocked by

- None - can start immediately
