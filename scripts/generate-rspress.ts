/**
 * Deno script for generating Rspress documentation content using Gemini API
 * Usage: deno run --allow-net --allow-write --allow-env --allow-read generate-rspress.ts "주제"
 */

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
	title: string;
	description: string;
	content: string;
}

interface GeneratedDoc {
	path: string;
	content: string;
}

async function callGemini<T>(prompt: string): Promise<T> {
	const apiKey = Deno.env.get('GEMINI_API_KEY');
	if (!apiKey) throw new Error('GEMINI_API_KEY not set');

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
	const text = data.candidates[0].content.parts[0].text;
	const parsed = JSON.parse(text);
	return Array.isArray(parsed) ? parsed[0] : parsed;
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

async function generateDocument(structure: SiteStructure, category: Category, doc: DocInfo): Promise<GeneratedDoc> {
	const prompt = `당신은 기술 문서 작성자입니다. 다음 문서를 작성하세요.

## 작성할 문서
카테고리: ${category.label}
제목: ${doc.title}
설명: ${doc.description}

## 응답 형식
아래 JSON 형식으로 응답하세요:

{
  "title": "문서 제목",
  "description": "문서 설명 (1-2문장)",
  "content": "마크다운 본문"
}

## Few-shot 예시

입력: 제목 "변수와 타입", 설명 "JavaScript의 변수 선언과 타입 시스템"

출력:
{
  "title": "변수와 타입",
  "description": "JavaScript의 변수 선언 방법과 동적 타입 시스템을 알아봅니다.",
  "content": "## 변수 선언\\n\\nJavaScript에서 변수를 선언하는 세 가지 방법이 있습니다.\\n\\n### let과 const\\n\\n\`\`\`javascript\\nlet count = 0;\\nconst PI = 3.14;\\n\`\`\`\\n\\n- **let**: 재할당 가능한 변수\\n- **const**: 재할당 불가능한 상수\\n\\n### 데이터 타입\\n\\nJavaScript는 동적 타입 언어입니다:\\n\\n1. string - 문자열\\n2. number - 숫자\\n3. boolean - 불리언\\n4. object - 객체\\n\\n> 💡 TypeScript를 사용하면 정적 타입 검사가 가능합니다."
}

## 작성 요구사항
- 300-500 단어
- 한국어로 작성
- 마크다운 헤더(##, ###), 리스트(-, 1.), 코드블록(\`\`\`) 적극 활용
- 실용적인 예제 포함`;

	const result = await callGemini<DocContent>(prompt);
	const md = `# ${result.title}\n\n${result.description}\n\n${result.content}`;
	return { path: `docs/${category.name}/${doc.slug}.md`, content: md };
}

function generateIndexPage(structure: SiteStructure): GeneratedDoc {
	const firstDoc = `/${structure.categories[0].name}/${structure.categories[0].docs[0].slug}`;

	const content = `---
pageType: home
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
      link: https://github.com/XIYO/replica-template-03
features:
  - title: ${structure.categories[0].label}
    details: ${structure.categories[0].docs.map(d => d.title).join(', ')}
  - title: ${structure.categories[1].label}
    details: ${structure.categories[1].docs.map(d => d.title).join(', ')}
---
`;
	return { path: 'docs/index.md', content };
}

function generateRspressConfig(structure: SiteStructure): string {
	const sidebar = structure.categories.map(c => ({
		text: c.label,
		items: c.docs.map(d => ({ text: d.title, link: `/${c.name}/${d.slug}` }))
	}));

	return `import { defineConfig } from 'rspress/config'
import sitemap from 'rspress-plugin-sitemap'
import { readFileSync } from 'fs'

const siteConfig = JSON.parse(readFileSync('./site.config.json', 'utf-8'))
const siteUrl = \`https://\${siteConfig.subdomain}.xiyo.dev\`

export default defineConfig({
  root: 'docs',
  title: siteConfig.title,
  description: siteConfig.description,
  plugins: [
    sitemap({
      domain: siteUrl
    })
  ],
  themeConfig: {
    socialLinks: [
      { icon: 'github', mode: 'link', content: \`https://github.com/\${siteConfig.githubRepo}\` }
    ],
    sidebar: {
      '/': ${JSON.stringify(sidebar, null, 8).replace(/^/gm, '      ').trim()}
    }
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
	await Deno.writeTextFile('rspress.config.ts', configContent);
	console.log('Updated: rspress.config.ts');
}

async function main() {
	const topic = Deno.args[0];
	if (!topic) {
		console.error('Usage: deno run generate-rspress.ts <topic>');
		Deno.exit(1);
	}

	console.log(`\nGenerating Rspress docs for: "${topic}"\n`);

	console.log('1. Generating structure...');
	const structure = await generateStructure(topic);

	console.log('2. Generating documents...');
	const docs: GeneratedDoc[] = [generateIndexPage(structure)];

	for (const cat of structure.categories) {
		for (const doc of cat.docs) {
			docs.push(await generateDocument(structure, cat, doc));
		}
	}

	console.log('3. Writing files...');
	const configContent = generateRspressConfig(structure);
	await writeFiles(docs, configContent);

	console.log(`\nUpdate site.config.json with:`);
	console.log(`  "title": "${structure.index.title}"`);
	console.log(`  "description": "${structure.index.description}"`);

	console.log('\nDone!');
}

main().catch(err => {
	console.error('Error:', err.message);
	Deno.exit(1);
});
