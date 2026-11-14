import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const readProjectFile = (file: string): string => readFileSync(join(process.cwd(), file), "utf-8");

describe("pi-subagents delegation policy guidance", () => {
	it("keeps delegation operator-authorized and cost-bounded", () => {
		const skill = readProjectFile("skills/pi-subagents/SKILL.md");
		const prompting = readProjectFile("skills/pi-subagents/references/prompting-and-roles.md");
		const orchestration = readProjectFile("skills/pi-subagents/references/orchestration.md");
		const guidance = [skill, prompting, orchestration].join("\n");

		assert.match(skill, /parent works directly by default/i);
		assert.match(skill, /only when the operator\s+requested delegation in the current request.*applicable user\/project\s+instructions/is);
		assert.match(skill, /task size, complexity, risk, tool-call count, recipe fit.*does not independently authorize delegation/is);
		assert.match(skill, /smallest bounded shape.*earns its token and\s+elapsed-time overhead/is);
		assert.match(prompting, /all launch guidance.*assumes delegation was requested by the operator/is);
		assert.match(orchestration, /recipes select a shape; they do not authorize delegation/i);
		assert.match(orchestration, /only after delegation is operator-authorized.*materially improves/is);

		assert.doesNotMatch(guidance, /not the routine primary doer/i);
		assert.doesNotMatch(guidance, /delegate[^\n]*(?:most|all) non-trivial requests/i);
		assert.doesNotMatch(guidance, /use this at the start of non-trivial work/i);
	});

	it("keeps T3 and native delegation distinct while requiring evidence in final reports", () => {
		const text = readProjectFile("skills/pi-subagents/SKILL.md");
		assert.match(text, /When delegation is operator-authorized in T3 Code, prefer the app-owned\s+`delegate_task` tool if the host exposes it and it can satisfy the task/i);
		assert.match(text, /Use the\s+native `subagent` runner when T3 is unavailable, the user or project chooses\s+native execution, or the task needs native Pi-child capabilities/i);
		assert.match(text, /do not assume shared\s+identifiers, lifecycle, controls,\s+permissions, or artifact locations/i);
		assert.match(text, /this package does not\s+implement or guess a T3 API/i);
		assert.match(text, /report which backend ran and whatever identity, status,\s+and result evidence it actually exposes/i);
		assert.match(text, /If the backend exposes a status or artifact, inspect it before\s+claiming completion/i);
		assert.match(text, /If status or result evidence is unavailable or cannot be\s+retrieved, say so and leave the outcome unverified/i);
		assert.match(text, /distinguish unverified claims from\s+independently checked evidence/i);
	});

	it("says which pi-subagents tools codemode scripts cannot call", () => {
		const text = readProjectFile("skills/pi-subagents/SKILL.md");
		assert.match(text, /`subagent`, `subagents_enable`, `subagent_supervisor`, `contact_supervisor`, and `structured_output`[^\n]*model-only/);
		assert.match(text, /codemode scripts cannot reach them through `tools\.\*`, `ALL_TOOLS`, or `searchTools`/i);
	});
});
