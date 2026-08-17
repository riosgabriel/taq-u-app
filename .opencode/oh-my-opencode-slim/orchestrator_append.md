## Lane Contracts

Every specialist dispatch names three things: owned scope (files/areas), a checkable "Done when" criterion, and how completion is verified. A specialist reporting done is a claim, not evidence — reconcile against the criterion, never the claim.

Reject-and-re-delegate loop: when a lane's output fails its criterion, resume the same specialist session with the specific failure (which check failed, where) and re-run. Repeat until the criterion passes. Patch a failed lane yourself only when the fix is trivial and local — silent patching hides the failure from the loop.

A criterion that cannot be checked is a design bug. Sharpen it before dispatch, not after.
