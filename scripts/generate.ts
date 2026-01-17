/**
 * Deno script for generating initial documentation content using Gemini API
 * Usage: deno run --allow-net --allow-write --allow-env --allow-read generate.ts "주제"
 */

// Types
interface DocInfo {
  slug: string;
  title: string;
  description: string;
}

interface Category {
  name: string;
  label: string;
  docs: DocInfo[];
}

interface SiteStructure {
  topic: string;
  categories: Category[];
  index: {
    title: string;
    tagline: string;
    description: string;
  };
}

interface DocContent {
  frontmatter: {
    title: string;
    description: string;
    template?: string;
    hero?: {
      tagline: string;
      actions: { text: string; link: string; icon: string }[];
    };
  };
  content: string;
}

interface GeneratedDoc {
  path: string;
  content: string;
}

// Gemini API call (always JSON mode)
async function callGemini<T>(prompt: string): Promise<T> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.error("Unexpected API response:", JSON.stringify(data, null, 2));
    throw new Error("Invalid API response structure");
  }

  const text = data.candidates[0].content.parts[0].text;

  try {
    const parsed = JSON.parse(text);
    // Handle array response (Gemini sometimes returns [{...}] instead of {...})
    return Array.isArray(parsed) ? parsed[0] : parsed;
  } catch {
    console.error("JSON parse error. Raw response:");
    console.error(text.substring(0, 1000) + "...");
    throw new Error("Failed to parse JSON response from Gemini");
  }
}

// Convert DocContent to markdown string
function toMarkdown(doc: DocContent): string {
  const lines: string[] = ["---"];

  lines.push(`title: "${doc.frontmatter.title}"`);
  lines.push(`description: "${doc.frontmatter.description}"`);

  if (doc.frontmatter.template) {
    lines.push(`template: ${doc.frontmatter.template}`);
  }

  if (doc.frontmatter.hero) {
    lines.push("hero:");
    lines.push(`  tagline: "${doc.frontmatter.hero.tagline}"`);
    lines.push("  actions:");
    for (const action of doc.frontmatter.hero.actions) {
      lines.push(`    - text: "${action.text}"`);
      lines.push(`      link: ${action.link}`);
      lines.push(`      icon: ${action.icon}`);
    }
  }

  lines.push("---");
  lines.push("");
  lines.push(doc.content);

  return lines.join("\n");
}

// Step 1: Generate site structure
async function generateStructure(topic: string): Promise<SiteStructure> {
  const prompt = `당신은 기술 문서 아키텍트입니다. 주어진 주제에 대한 문서 사이트 구조를 설계하세요.

주제: "${topic}"

다음 JSON 스키마로 응답하세요:
{
  "topic": "string - 주제",
  "categories": [
    {
      "name": "string - 영문 슬러그 (소문자, 하이픈)",
      "label": "string - 한글 라벨",
      "docs": [
        {
          "slug": "string - 영문 슬러그",
          "title": "string - 문서 제목",
          "description": "string - 문서 설명 (1문장)"
        }
      ]
    }
  ],
  "index": {
    "title": "string - 사이트 제목",
    "tagline": "string - 한 줄 소개",
    "description": "string - 사이트 설명 (2-3문장)"
  }
}

요구사항:
- 정확히 3개의 카테고리
- 각 카테고리에 정확히 3개의 문서
- slug는 영문 소문자와 하이픈만 사용
- 초보자부터 고급까지 단계적 구성
- 실용적이고 구체적인 내용`;

  const result = await callGemini<SiteStructure>(prompt);

  // Validate structure
  if (!result.categories || !Array.isArray(result.categories)) {
    console.error("Invalid structure response:", JSON.stringify(result, null, 2));
    throw new Error("Invalid structure: missing categories");
  }

  return result;
}

// Step 2: Generate individual document
async function generateDocument(
  structure: SiteStructure,
  category: Category,
  doc: DocInfo
): Promise<GeneratedDoc> {
  const otherDocs = structure.categories
    .flatMap((c) =>
      c.docs.map((d) => `- [${c.label}] ${d.title}: ${d.description}`)
    )
    .join("\n");

  const prompt = `당신은 기술 문서 작성자입니다. 다음 문서를 작성하세요.

## 전체 사이트 구조
주제: ${structure.topic}

문서 목록:
${otherDocs}

## 작성할 문서
카테고리: ${category.label} (${category.name})
제목: ${doc.title}
설명: ${doc.description}

## 응답 JSON 스키마
{
  "frontmatter": {
    "title": "string - 문서 제목",
    "description": "string - 문서 설명"
  },
  "content": "string - 마크다운 본문 (frontmatter 제외)"
}

## 본문 작성 요구사항
- 실용적인 예제 코드 포함
- 300-500 단어
- 한국어로 작성
- 다른 문서와의 연관성 고려
- 마크다운 문법 사용 (헤더, 리스트, 코드블록 등)

## 중요: JSON 형식 규칙
- content 필드는 단일 문자열로 작성
- 개행은 반드시 \\n으로 이스케이프
- 큰따옴표는 \\"로 이스케이프
- 백슬래시는 \\\\로 이스케이프`;

  const result = await callGemini<DocContent>(prompt);
  return {
    path: `src/content/docs/${category.name}/${doc.slug}.md`,
    content: toMarkdown(result),
  };
}

// Step 3: Generate index page
async function generateIndexPage(
  structure: SiteStructure
): Promise<GeneratedDoc> {
  const categorySummary = structure.categories
    .map((c) => `- ${c.label}: ${c.docs.map((d) => d.title).join(", ")}`)
    .join("\n");

  const firstDoc = `/${structure.categories[0].name}/${structure.categories[0].docs[0].slug}/`;

  const prompt = `당신은 기술 문서 작성자입니다. 문서 사이트의 메인 페이지를 작성하세요.

주제: ${structure.topic}
제목: ${structure.index.title}
태그라인: ${structure.index.tagline}
설명: ${structure.index.description}

카테고리 구성:
${categorySummary}

## 응답 JSON 스키마
{
  "frontmatter": {
    "title": "string - 사이트 제목",
    "description": "string - 사이트 설명",
    "template": "splash",
    "hero": {
      "tagline": "string - 태그라인",
      "actions": [
        { "text": "시작하기", "link": "${firstDoc}", "icon": "right-arrow" }
      ]
    }
  },
  "content": "string - hero 아래 소개 내용 (마크다운, 3-5문장)"
}

## 중요: JSON 형식 규칙
- content 필드는 단일 문자열로 작성
- 개행은 반드시 \\n으로 이스케이프
- 큰따옴표는 \\"로 이스케이프`;

  const result = await callGemini<DocContent>(prompt);
  return {
    path: "src/content/docs/index.mdx",
    content: toMarkdown(result),
  };
}

// Step 4: Generate astro.config.mjs
function generateAstroConfig(structure: SiteStructure): string {
  const sidebarEntries = structure.categories
    .map(
      (c) =>
        `				{ label: '${c.label}', autogenerate: { directory: '${c.name}' } },`
    )
    .join("\n");

  return `// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import cloudflare from '@astrojs/cloudflare';
import { readFileSync } from 'node:fs';

const siteConfig = JSON.parse(readFileSync('./site.config.json', 'utf-8'));
const siteUrl = \`https://\${siteConfig.subdomain}.xiyo.dev\`;

export default defineConfig({
	site: siteUrl,
	output: 'static',
	adapter: cloudflare(),
	integrations: [
		starlight({
			title: siteConfig.title,
			customCss: ['./src/styles/custom.css'],
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: \`https://github.com/\${siteConfig.githubRepo}\`,
				},
			],
			sidebar: [
${sidebarEntries}
			],
		}),
	],
});
`;
}

// Write files
async function writeFiles(docs: GeneratedDoc[], astroConfig: string) {
  for (const doc of docs) {
    const dir = doc.path.substring(0, doc.path.lastIndexOf("/"));
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(doc.path, doc.content);
    console.log(`Created: ${doc.path}`);
  }

  await Deno.writeTextFile("astro.config.mjs", astroConfig);
  console.log("Updated: astro.config.mjs");
}

// Main
async function main() {
  const topic = Deno.args[0];
  if (!topic) {
    console.error("Usage: deno run generate.ts <topic>");
    Deno.exit(1);
  }

  console.log(`\nGenerating documentation for: "${topic}"\n`);

  // Step 1: Generate structure
  console.log("1. Generating site structure...");
  const structure = await generateStructure(topic);
  console.log(`   - ${structure.categories.length} categories`);
  console.log(
    `   - ${structure.categories.reduce((sum, c) => sum + c.docs.length, 0)} documents`
  );

  // Step 2: Generate all documents in parallel
  console.log("\n2. Generating documents in parallel...");
  const tasks: Promise<GeneratedDoc>[] = [];

  tasks.push(generateIndexPage(structure));

  for (const category of structure.categories) {
    for (const doc of category.docs) {
      tasks.push(generateDocument(structure, category, doc));
    }
  }

  const docs = await Promise.all(tasks);
  console.log(`   - Generated ${docs.length} documents`);

  // Step 3: Generate astro config
  console.log("\n3. Generating astro.config.mjs...");
  const astroConfig = generateAstroConfig(structure);

  // Step 4: Write files
  console.log("\n4. Writing files...");
  await writeFiles(docs, astroConfig);

  console.log("\nDone!");
}

main().catch((err) => {
  console.error("Error:", err.message);
  Deno.exit(1);
});
