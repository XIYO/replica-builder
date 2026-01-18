/**
 * Deno script for generating VitePress documentation content using Gemini API
 * Usage: deno run --allow-net --allow-write --allow-env --allow-read generate-vitepress.ts "주제"
 */

const LOCALE = { code: 'ko', label: '한국어', lang: 'ko-KR' } as const;

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
	};
	content: string;
}

interface GeneratedDoc {
	path: string;
	content: string;
}

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

	return await callGemini<SiteStructure>(prompt);
}

async function generateDocument(category: Category, doc: DocInfo): Promise<DocContent> {
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

function generateIndexPage(structure: SiteStructure): GeneratedDoc {
	const firstDoc = `/${LOCALE.code}/${structure.categories[0].name}/${structure.categories[0].docs[0].slug}`;

	const features = structure.categories.map((c) => ({
		title: c.label,
		details: c.docs.map((d) => d.title).join(', ')
	}));

	const content = `---
layout: home

hero:
  name: "${structure.index.title}"
  text: "${structure.index.tagline}"
  tagline: "${structure.index.description}"
  actions:
    - theme: brand
      text: 시작하기
      link: ${firstDoc}
    - theme: alt
      text: GitHub
      link: https://github.com/XIYO/replica-template-01

features:
  - title: ${features[0].title}
    details: ${features[0].details}
  - title: ${features[1].title}
    details: ${features[1].details}
---
`;
	return { path: `docs/index.md`, content };
}

function generateVitePressConfig(structure: SiteStructure): string {
	const sidebar = structure.categories.map((c) => ({
		text: c.label,
		items: c.docs.map((d) => ({
			text: d.title,
			link: `/${c.name}/${d.slug}`
		}))
	}));

	return `import { defineConfig } from 'vitepress'
import { readFileSync } from 'fs'

const siteConfig = JSON.parse(readFileSync('./site.config.json', 'utf-8'))
const siteUrl = \`https://\${siteConfig.subdomain}.xiyo.dev\`

export default defineConfig({
  title: siteConfig.title,
  description: siteConfig.description,
  lastUpdated: siteConfig.lastUpdated,
  lang: '${LOCALE.lang}',

  sitemap: {
    hostname: siteUrl
  },

  head: [
    ['style', {}, \`
      :root {
        --vp-c-brand-1: \${siteConfig.accentColor};
        --vp-c-brand-2: \${siteConfig.accentColor}dd;
        --vp-c-brand-3: \${siteConfig.accentColor}bb;
      }
    \`]
  ],

  themeConfig: {
    sidebar: ${JSON.stringify(sidebar, null, 4).replace(/^/gm, '    ').trim()},
    socialLinks: [
      { icon: 'github', link: \`https://github.com/\${siteConfig.githubRepo}\` }
    ]
  }
})
`;
}

async function writeFiles(docs: GeneratedDoc[], configContent: string) {
	for (const doc of docs) {
		const dir = doc.path.substring(0, doc.path.lastIndexOf('/'));
		await Deno.mkdir(dir, { recursive: true });
		await Deno.writeTextFile(doc.path, doc.content);
		console.log(`Created: ${doc.path}`);
	}
	await Deno.writeTextFile('docs/.vitepress/config.ts', configContent);
	console.log('Updated: docs/.vitepress/config.ts');
}

async function main() {
	const topic = Deno.args[0];
	if (!topic) {
		console.error('Usage: deno run generate-vitepress.ts <topic>');
		Deno.exit(1);
	}

	console.log(`\nGenerating VitePress docs for: "${topic}"\n`);

	// Step 1: Generate structure
	console.log('1. Generating structure...');
	const structure = await generateStructure(topic);

	// Step 2: Generate documents
	console.log('2. Generating documents...');
	const allDocs: GeneratedDoc[] = [generateIndexPage(structure)];

	for (const category of structure.categories) {
		for (const doc of category.docs) {
			const content = await generateDocument(category, doc);
			const md = `# ${content.frontmatter.title}\n\n${content.frontmatter.description}\n\n${content.content.replace(/\\n/g, '\n')}`;
			allDocs.push({
				path: `docs/${category.name}/${doc.slug}.md`,
				content: md
			});
			console.log(`   - Generated: ${doc.title}`);
		}
	}

	// Step 3: Write files
	console.log('3. Writing files...');
	const configContent = generateVitePressConfig(structure);
	await writeFiles(allDocs, configContent);

	console.log(`\nUpdate site.config.json with:`);
	console.log(`  "title": "${structure.index.title}"`);
	console.log(`  "description": "${structure.index.description}"`);

	console.log(`\nDone! Generated ${allDocs.length} documents.`);
}

main().catch((err) => {
	console.error('Error:', err.message);
	Deno.exit(1);
});
