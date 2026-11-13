import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { findConfiguredProjectRoot, resolveAgentName, type AgentConfig } from "../../src/agents/agents.ts";

function makeAgent(name: string, localName?: string): AgentConfig {
	return {
		name,
		localName,
		description: `${name} agent`,
		systemPromptMode: "replace",
		inheritProjectContext: false,
		inheritSkills: false,
		systemPrompt: "Inspect",
		source: "project",
		filePath: path.join(".pi", "agents", `${name}.md`),
	};
}

describe("resolveAgentName", () => {
	it("prefers an exact canonical name over a packaged local name", () => {
		const plain = makeAgent("scout");
		const packaged = makeAgent("code-analysis.scout", "scout");

		assert.equal(resolveAgentName("scout", [plain, packaged]).agent, plain);
		assert.equal(resolveAgentName("code-analysis.scout", [plain, packaged]).agent, packaged);
	});

	it("uses a unique packaged local name when no canonical name exists", () => {
		const packaged = makeAgent("code-analysis.scout", "scout");

		assert.equal(resolveAgentName("scout", [packaged]).agent, packaged);
	});

	it("rejects a local name shared by multiple packaged agents", () => {
		const result = resolveAgentName("scout", [
			makeAgent("code-analysis.scout", "scout"),
			makeAgent("repository.scout", "scout"),
		]);

		assert.match(result.error ?? "", /Ambiguous local agent name 'scout': code-analysis\.scout, repository\.scout/);
	});

	it("resolves a unique canonical name without case sensitivity after exact lookup", () => {
		const agent = makeAgent("scout");

		assert.equal(resolveAgentName("Scout", [agent]).agent, agent);
	});

	it("keeps exact local names ahead of case-insensitive canonical names", () => {
		const canonical = makeAgent("Scout");
		const local = makeAgent("project.lookup", "scout");

		assert.equal(resolveAgentName("scout", [canonical, local]).agent, local);
	});

	it("rejects case-insensitive canonical collisions rather than choosing arbitrarily", () => {
		const result = resolveAgentName("SCOUT", [makeAgent("scout"), makeAgent("Scout")]);

		assert.match(result.error ?? "", /Ambiguous agent name 'SCOUT': scout, Scout/);
	});

	it("resolves local names and aliases case-insensitively after exact categories", () => {
		const local = makeAgent("package.scout", "Scout");
		const alias = { ...makeAgent("package.researcher"), aliases: ["Research"] };

		assert.equal(resolveAgentName("scout", [local]).agent, local);
		assert.equal(resolveAgentName("RESEARCH", [alias]).agent, alias);
	});

	it("prefers exact aliases over case-insensitive canonical names", () => {
		const canonical = makeAgent("SCOUT");
		const alias = { ...makeAgent("package.lookup"), aliases: ["scout"] };

		assert.equal(resolveAgentName("scout", [canonical, alias]).agent, alias);
	});

	it("prioritizes case-insensitive canonical names over local names", () => {
		const canonical = makeAgent("Scout");
		const local = makeAgent("package.lookup", "SCOUT");

		assert.equal(resolveAgentName("scout", [canonical, local]).agent, canonical);
	});

	it("rejects case-insensitive local-name and alias collisions", () => {
		const localResult = resolveAgentName("SCOUT", [
			makeAgent("package.one", "Scout"),
			makeAgent("package.two", "scout"),
		]);
		const aliasResult = resolveAgentName("RESEARCH", [
			{ ...makeAgent("package.one"), aliases: ["Research"] },
			{ ...makeAgent("package.two"), aliases: ["research"] },
		]);

		assert.match(localResult.error ?? "", /Ambiguous local agent name 'SCOUT'/);
		assert.match(aliasResult.error ?? "", /Ambiguous agent alias 'RESEARCH'/);
	});
});

describe("findConfiguredProjectRoot", () => {
	it("does not reinterpret user config reached through a home alias as project config", () => {
		const previousHome = process.env.HOME;
		const previousUserProfile = process.env.USERPROFILE;
		const isolatedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agent-home-"));
		const isolatedHome = path.join(isolatedRoot, "home");
		const homeAlias = path.join(isolatedRoot, "home-alias");

		try {
			fs.mkdirSync(isolatedHome);
			fs.symlinkSync(isolatedHome, homeAlias, process.platform === "win32" ? "junction" : "dir");
			process.env.HOME = isolatedHome;
			process.env.USERPROFILE = isolatedHome;
			const nested = fs.mkdtempSync(path.join(homeAlias, "agent-project-"));
			fs.mkdirSync(path.join(isolatedHome, ".pi"));

			assert.equal(findConfiguredProjectRoot(nested), null);

			fs.mkdirSync(path.join(nested, ".pi"));
			assert.equal(findConfiguredProjectRoot(nested), nested);
		} finally {
			if (previousHome === undefined) delete process.env.HOME;
			else process.env.HOME = previousHome;
			if (previousUserProfile === undefined) delete process.env.USERPROFILE;
			else process.env.USERPROFILE = previousUserProfile;
			fs.rmSync(isolatedRoot, { recursive: true, force: true });
		}
	});
});
