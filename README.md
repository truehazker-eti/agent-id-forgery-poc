# Alien Agent ID — forgery PoC

This repo demonstrates that an Alien Agent ID binding can be forged offline using a publicly-extractable `id_token` from any commit's `refs/notes/agent-id`.

## What was done

1. Cloned the public `alien-id/agent-id` repo and fetched `refs/notes/agent-id`.
2. Extracted the `id_token` (JWT signed by `https://sso.alien-api.com`) from a commit's proof bundle.
3. Generated a fresh, attacker-controlled Ed25519 keypair locally.
4. Hand-built an `owner-binding.json` claiming the victim's AlienID as owner, signed by the attacker's key. Re-used the stolen `id_token` verbatim.
5. Made a normal commit via the upstream `cli.mjs git-commit` — produces a SSH-signed commit with full Agent-ID trailers and proof bundle.

The resulting commit passes `git-verify` end-to-end. The "owner" trailer points at an AlienID whose real human did not approve this agent.

## Why this works

- The id_token never references any agent pubkey — SSO is agent-blind.
- The proof note publishes the id_token, so it is not a secret.
- `verifyIdTokenSignatureOnly` ignores expiry — forgeries remain "valid" forever.
- The binding is self-attested: the agent signs its own claim of ownership.

## What stops it in practice

Only out-of-band fingerprint pinning (e.g. GitHub's SSH Signing Key registry) — and *only if* the verifier checks that pin. The protocol-level chain alone cannot tell this commit from a legitimate one.
