/**
 * Deno script for generating initial documentation content using Gemini API
 * Usage: deno run --allow-net --allow-write --allow-env --allow-read generate.ts "주제"
 */

const LOCALE = { code: 'ko', label: '한국어', lang: 'ko-KR' } as const;

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
async function callGemini<T>(prompt: string, retries = 3): Promise<T> {
	const apiKey = Deno.env.get('GEMINI_API_KEY');
	if (!apiKey) throw new Error('GEMINI_API_KEY not set');

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const response = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						contents: [{ parts: [{ text: prompt }] }],
						generationConfig: {
							responseMimeType: 'application/json',
							maxOutputTokens: 8192
						}
					})
				}
			);

			if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
			const data = await response.json();
			if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('Invalid API response');

			let text = data.candidates[0].content.parts[0].text.trim();

			// Extract JSON object/array from response
			const jsonStart = text.indexOf('{');
			const jsonArrayStart = text.indexOf('[');
			const startIndex = jsonArrayStart >= 0 && (jsonArrayStart < jsonStart || jsonStart < 0)
				? jsonArrayStart : jsonStart;

			if (startIndex > 0) text = text.substring(startIndex);

			// Find matching closing bracket
			let depth = 0;
			let endIndex = -1;
			const openChar = text[0];
			const closeChar = openChar === '{' ? '}' : ']';

			for (let i = 0; i < text.length; i++) {
				if (text[i] === openChar) depth++;
				else if (text[i] === closeChar) {
					depth--;
					if (depth === 0) {
						endIndex = i + 1;
						break;
					}
				}
			}

			if (endIndex > 0) text = text.substring(0, endIndex);

			const parsed = JSON.parse(text);
			return Array.isArray(parsed) ? parsed[0] : parsed;
		} catch (error) {
			if (attempt === retries) throw error;
			console.log(`   Retry ${attempt}/${retries} due to: ${(error as Error).message}`);
			await new Promise(r => setTimeout(r, 1000 * attempt));
		}
	}
	throw new Error('Max retries exceeded');
}

// Convert DocContent to markdown string
function toMarkdown(doc: DocContent): string {
	const lines: string[] = ['---'];

	lines.push(`title: "${doc.frontmatter.title}"`);
	lines.push(`description: "${doc.frontmatter.description}"`);

	if (doc.frontmatter.template) {
		lines.push(`template: ${doc.frontmatter.template}`);
	}

	if (doc.frontmatter.hero) {
		lines.push('hero:');
		lines.push(`  tagline: "${doc.frontmatter.hero.tagline}"`);
		lines.push('  actions:');
		for (const action of doc.frontmatter.hero.actions) {
			lines.push(`    - text: "${action.text}"`);
			lines.push(`      link: ${action.link}`);
			lines.push(`      icon: ${action.icon}`);
		}
	}

	lines.push('---');
	lines.push('');
	const content = doc.content.replace(/\\n/g, '\n');
	lines.push(content);

	return lines.join('\n');
}

// Generate site structure (Korean)
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
- 정확히 2개의 카테고리
- 각 카테고리에 정확히 3개의 문서
- slug는 영문 소문자와 하이픈만 사용
- 실용적이고 구체적인 내용`;

	const result = await callGemini<SiteStructure>(prompt);

	if (!result.categories || !Array.isArray(result.categories)) {
		console.error('Invalid structure response:', JSON.stringify(result, null, 2));
		throw new Error('Invalid structure: missing categories');
	}

	return result;
}

// Generate individual document
async function generateDocument(
	_structure: SiteStructure,
	category: Category,
	doc: DocInfo
): Promise<DocContent> {
	const prompt = `당신은 기술 문서 작성자입니다. 다음 문서를 작성하세요.

## 작성할 문서
카테고리: ${category.label}
제목: ${doc.title}
설명: ${doc.description}

## 응답 형식
아래 JSON 형식으로 응답하세요:

{
  "frontmatter": {
    "title": "문서 제목",
    "description": "문서 설명 (1-2문장)"
  },
  "content": "마크다운 본문"
}

## Few-shot 예시

입력: 제목 "변수와 타입", 설명 "JavaScript의 변수 선언과 타입 시스템"

출력:
{
  "frontmatter": {
    "title": "변수와 타입",
    "description": "JavaScript의 변수 선언 방법과 동적 타입 시스템을 알아봅니다."
  },
  "content": "## 변수 선언\\n\\nJavaScript에서 변수를 선언하는 세 가지 방법이 있습니다.\\n\\n### let과 const\\n\\n\`\`\`javascript\\nlet count = 0;\\nconst PI = 3.14;\\n\`\`\`\\n\\n- **let**: 재할당 가능한 변수\\n- **const**: 재할당 불가능한 상수\\n\\n### 데이터 타입\\n\\nJavaScript는 동적 타입 언어입니다:\\n\\n1. string - 문자열\\n2. number - 숫자\\n3. boolean - 불리언\\n4. object - 객체\\n\\n> 💡 TypeScript를 사용하면 정적 타입 검사가 가능합니다."
}

## 작성 요구사항
- 300-500 단어
- 한국어로 작성
- 마크다운 헤더(##, ###), 리스트(-, 1.), 코드블록(\`\`\`) 적극 활용
- 실용적인 예제 포함`;

	return await callGemini<DocContent>(prompt);
}

// Generate index page
async function generateIndexPage(structure: SiteStructure): Promise<DocContent> {
	const categorySummary = structure.categories
		.map((c) => `- ${c.label}: ${c.docs.map((d) => d.title).join(', ')}`)
		.join('\n');

	const firstDoc = `/${LOCALE.code}/${structure.categories[0].name}/${structure.categories[0].docs[0].slug}/`;

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

	return await callGemini<DocContent>(prompt);
}

// Generate astro.config.mjs
function generateAstroConfig(structure: SiteStructure): string {
	const sidebarEntries = structure.categories
		.map((c) => `				{ label: '${c.label}', autogenerate: { directory: '${c.name}' } },`)
		.join('\n');

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
			defaultLocale: '${LOCALE.code}',
			locales: {
				'${LOCALE.code}': { label: '${LOCALE.label}', lang: '${LOCALE.lang}' }
			},
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
		const dir = doc.path.substring(0, doc.path.lastIndexOf('/'));
		await Deno.mkdir(dir, { recursive: true });
		await Deno.writeTextFile(doc.path, doc.content);
		console.log(`Created: ${doc.path}`);
	}

	await Deno.writeTextFile('astro.config.mjs', astroConfig);
	console.log('Updated: astro.config.mjs');
}

// Main
async function main() {
	const topic = Deno.args[0];
	if (!topic) {
		console.error('Usage: deno run generate.ts <topic>');
		Deno.exit(1);
	}

	console.log(`\nGenerating documentation for: "${topic}"\n`);

	// Step 1: Generate structure
	console.log('1. Generating site structure...');
	const structure = await generateStructure(topic);
	console.log(`   - ${structure.categories.length} categories`);
	console.log(`   - ${structure.categories.reduce((sum, c) => sum + c.docs.length, 0)} documents`);

	// Step 2: Generate documents
	console.log('\n2. Generating documents...');
	const allDocs: GeneratedDoc[] = [];

	// Generate index page
	const indexPage = await generateIndexPage(structure);
	allDocs.push({
		path: `src/content/docs/${LOCALE.code}/index.mdx`,
		content: toMarkdown(indexPage)
	});

	// Generate all documents
	for (const category of structure.categories) {
		for (const doc of category.docs) {
			const content = await generateDocument(structure, category, doc);
			allDocs.push({
				path: `src/content/docs/${LOCALE.code}/${category.name}/${doc.slug}.md`,
				content: toMarkdown(content)
			});
			console.log(`   - Generated: ${doc.title}`);
		}
	}

	console.log(`   - Total documents: ${allDocs.length}`);

	// Step 3: Generate astro config
	console.log('\n3. Generating astro.config.mjs...');
	const astroConfig = generateAstroConfig(structure);

	// Step 4: Write files
	console.log('\n4. Writing files...');
	await writeFiles(allDocs, astroConfig);

	console.log('\nDone!');
	console.log(`\nGenerated ${allDocs.length} documents.`);
}

main().catch((err) => {
	console.error('Error:', err.message);
	Deno.exit(1);
});
