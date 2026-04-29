# Alien Agent ID — forgery PoC

This repo demonstrates that an Alien Agent ID binding can be forged offline using a publicly-extractable `id_token` from any commit's `refs/notes/agent-id`. The forgery passes the upstream `git-verify` chain end-to-end, and **GitHub's "Verified" badge can be obtained by the attacker as well** — making the forgery visually indistinguishable from a legitimate commit.

## What was done

1. Cloned the public `alien-id/agent-id` repo and fetched `refs/notes/agent-id`.
2. Extracted the `id_token` (JWT signed by `https://sso.alien-api.com`) from a commit's proof bundle.
3. Generated a fresh, attacker-controlled Ed25519 keypair locally.
4. Hand-built an `owner-binding.json` claiming the victim's AlienID as owner, signed by the attacker's key. Re-used the stolen `id_token` verbatim.
5. Made a normal commit via the upstream `cli.mjs git-commit` — produces an SSH-signed commit with full Agent-ID trailers and proof bundle.
6. Registered the attacker keypair as a Signing Key on a GitHub account and pushed.

Result: the upstream `git-verify` reports `"ok": true` with six green provenance checks and zero warnings, claiming the commit was made by an agent owned by AlienID `0000000701000000000027dfbf386c25` — even though that human never approved any of this.

## Why this works

- The `id_token` never references any agent pubkey. SSO is **agent-blind** — the agent's public key is never sent in `/oauth/authorize` or `/oauth/token`. The token only attests "a human approved provider P at time T."
- The proof note **publishes the `id_token`**, so it is not a secret. Anyone with read access to a public repo using Agent-ID can extract every committer's `id_token`.
- `verifyIdTokenSignatureOnly` deliberately ignores expiry, so a leaked `id_token` produces forgeries that **remain "valid" forever** — even after expiry, even after revocation.
- The binding is **self-attested**: the agent signs its own claim of ownership. Substituting the agent's pubkey everywhere it appears (binding payload, proof bundle, trailer fingerprint) is undetectable, because the `id_token` doesn't reference the pubkey at all.

## Why GitHub's "Verified" badge does not stop this

A common framing is that GitHub's SSH Signing Key registry serves as the practical defense — that "Verified" badges anchor agent fingerprints to real human identities. **It does not.**

GitHub pins `(SSH key) → (GitHub account)`. Agent-ID claims `(SSH key) → (AlienID)`. These are two different relationships. Nothing in the system links them.

An attacker can:

1. Create any GitHub account — including a typosquat of the victim (`truehazker_eti`, `truehazker-eti-real`, …) or a fresh account entirely.
2. Add the attacker-generated keypair as a **Signing Key** on that account.
3. Push the forged commit. GitHub renders a green "Verified" badge linked to the attacker's account.

Every Agent-aware verifier (CI, audit tools, third-party services, anyone running `git-verify`) sees:
- ✅ valid SSH signature
- ✅ valid binding signature
- ✅ valid `id_token` RS256 signature against SSO JWKS
- → "this is an agent of AlienID `0000000701…`"

GitHub's "Verified" badge **lives only in github.com's web UI**. It does not appear in `git log --show-signature`, in clones, in `git-verify` output, in `git format-patch`, in mirrors on other forges, or in any external tool that reads Agent-ID trailers. Outside of GitHub.com's specific commit page, the badge is invisible.

In short: GitHub answers "is this SSH key registered to *some* GitHub account?" That is the wrong question. The right question — "is this SSH key the one AlienID `0000000701…` actually approved?" — is one nothing in the protocol can answer.

## Live demonstration

Forged commit: `3a70d8f7cb3d1d408b76ad15945a5898d6d877ce`

- Author: `truehazker-eti` (the GitHub account holder, *not* the AlienID holder).
- Agent-ID-Owner: `0000000701000000000027dfbf386c25` — extracted from a public commit on `alien-id/agent-id`. The human at this AlienID has no idea this commit exists.
- Agent-ID-Fingerprint: `fa9a8d4e7556985cf2bbfca23f8cea80d7d2501d6570fdb2d6e2b349289a116c` — locally-generated, never registered with Alien SSO, never seen by the AlienID holder.
- Agent-ID-Binding: `44797dc1-9bf3-4669-beb7-b9ef47993c81` — fabricated locally and signed by the attacker keypair.

Verify it yourself:

```bash
git clone https://github.com/truehazker-eti/agent-id-forgery-poc
cd agent-id-forgery-poc
git fetch origin refs/notes/agent-id:refs/notes/agent-id
node /path/to/skills/alien-agent-id/cli.mjs git-verify --commit HEAD
```

Output: `"ok": true`, summary `Commit 3a70d8f7cb3d was signed by agent fa9a8d4e7556985c... owned by 0000000701000000000027dfbf386c25`. Six green provenance checks, zero warnings.

## What would actually fix this

The protocol has no intrinsic defense. Closing the gap requires architectural changes:

- **Bind the agent's pubkey into the OIDC flow.** Send `code_challenge = sha256(agent_pubkey || nonce)` instead of a random PKCE nonce, and have SSO embed a `cnf` (proof-of-possession) claim into the `id_token` (RFC 7800). The `id_token` then cryptographically commits to the keypair — substitution becomes impossible.
- **Stop publishing raw `id_tokens` in git notes.** Use a per-commit attestation document scoped to the specific commit hash and agent fingerprint, minted by SSO on demand. Leaking the public artifact then gives the attacker a single-use witness, not a forever-replayable one.
- **Server-side agent registry.** SSO records "human H approved agent fingerprint F." Verifiers query online: "is fingerprint F authorized by H?" Trades offline verifiability for actual uniqueness.

Until one of these lands, the cryptographic chain on its own provides **provenance theater, not provenance certainty.** Out-of-band fingerprint pinning published by the AlienID holder (on a domain they control, in a verified profile, etc.) is the only real mitigation — and the protocol defines no convention for it, so verifiers must opt in manually.
