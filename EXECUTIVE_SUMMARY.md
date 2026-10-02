# CovidWeb security review: executive summary

*A one-page version of [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for readers who decide rather than build. Reviewed and fixed in September 2026.*

## Bottom line

| | Overall risk | Fit to hold real patient data? |
| --- | --- | --- |
| **2021 version** | **Critical** | No. Anyone, without logging in, could read any patient's record, create an administrator account, or stop the service with one request. |
| **Today** | **Low** | Yes for a pilot, once it runs behind HTTPS with an encrypted database (two deployment steps, below). |

The review found **13 issues**: 2 critical, 3 high, 6 medium, 1 low and 1 informational. **11 are fixed and retested**. The other two need action outside the code and have a plan.

## What was at stake

- **Patients' health data.** ID numbers, addresses, test results and clinical status were open to anyone who found the address, and were pushed to every connected browser. Colombian law (Ley 1581 de 2012) treats health data as sensitive personal data. A leak means fines from the Superintendencia de Industria y Comercio of up to 2,000 monthly minimum wages, on top of the harm to the patients.
- **Who can do what.** The roles (administrator, doctor, assistant) existed only in the menus. Anyone could create staff accounts or change a patient's clinical status. Staff passwords were stored, and printed in the logs, in plain text.
- **Availability.** Looking up an ID number that did not exist, even by typing mistake, stopped the whole service for everyone.
- **Record accuracy.** Two assistants registering patients at the same time could be given the same case number, so updates would land in the wrong patient's file.

## What was done

| Priority | Risk addressed | Action | Status |
| --- | --- | --- | --- |
| P1, immediate | Anyone can read records or act as staff | Real login with sessions; every page and action checks the user's role on the server; lockout after repeated failures | Done |
| P1, immediate | Database theft through the search forms | Every query rewritten so user input can never change it; the database account can no longer delete or alter data | Done |
| P1, immediate | Records sent to every browser | Each answer goes only to the person who asked | Done |
| P1, immediate | One lookup stops the service | Errors now end one request, not the service; automatic restart | Done |
| P2, this sprint | Plaintext passwords, data in logs, flawed third-party code | Passwords stored as one-way hashes; logs record who did what, never data; 19 vulnerable packages reduced to 0 | Done |
| P2, this sprint | Wrong case numbers, hijackable deployment, injected script | Each registration gets its own number; signed deployments only; browser-side protections | Done |
| P3, before go-live | Data readable on the network and on disk; addresses sent to the map provider | HTTPS, database encryption, geocode once and store approximate locations | Planned |

## Remediation roadmap

1. **Week 1 (done):** close the four P1 risks, then retest each one with the exact steps that proved it.
2. **Week 2 (done):**
   - fix the P2 items;
   - add 35 automated tests that fail if any issue returns;
   - run them on every change.
3. **Before go-live (owner):**
   - put the service behind HTTPS;
   - turn on database and backup encryption;
   - create the first administrator account and reset any old passwords;
   - decide on the address-geocoding change.
4. **Ongoing:**
   - review the audit log of who viewed or changed each case;
   - the automated dependency check flags new third-party flaws on every change.

## Decisions needed from the owner

- **Hosting:** where HTTPS terminates, and confirmation that the database has encryption at rest enabled.
- **Map provider:** accept sending patient addresses to the map provider, under a data-processing agreement, or approve geocoding once at registration and keeping only approximate locations. The second option is recommended.

## How we know it worked

Every issue was first reproduced on an isolated lab copy, with synthetic patients and harmless inputs. After the fix, the same steps were run again and each one was blocked. Every page was then used with each role. The 35 automated tests and the dependency check run on every change. The detail for each issue is in [SECURITY_REVIEW.md](SECURITY_REVIEW.md).
