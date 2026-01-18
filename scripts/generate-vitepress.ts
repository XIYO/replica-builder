/**
 * Deno script for generating VitePress documentation content using Gemini API
 * with multi-language support (ko, zh, ja, en)
 * Usage: deno run --allow-net --allow-write --allow-env --allow-read generate-vitepress.ts "주제"
 */

// Language configuration
const LOCALES = [
	{ code: 'ko', label: '한국어', lang: 'ko-KR' },
	{ code: 'zh', label: '简体中文', lang: 'zh-CN' },
	{ code: 'ja', label: '日本語', lang: 'ja-JP' },
	{ code: 'en', label: 'English', lang: 'en-US' }
] as const;

const DEFAULT_LOCALE = 'ko';

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

interface TranslatedStructure {
	categories: { label: string; docs: { title: string; description: string }[] }[];
	index: { title: string; tagline: string; description: string };
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

async function translateStructure(
	structure: SiteStructure,
	targetLang: string
): Promise<TranslatedStructure> {
	const langNames: Record<string, string> = {
		zh: '简体中文',
		ja: '日本語',
		en: 'English'
	};

	const prompt = `다음 한국어 문서 구조를 ${langNames[targetLang]}로 번역하세요.

원본 (한국어):
${JSON.stringify(
		{
			categories: structure.categories.map((c) => ({
				label: c.label,
				docs: c.docs.map((d) => ({ title: d.title, description: d.description }))
			})),
			index: structure.index
		},
		null,
		2
	)}

다음 JSON 형식으로 응답하세요:
{
  "categories": [
    {
      "label": "string - 번역된 카테고리 라벨",
      "docs": [
        {
          "title": "string - 번역된 문서 제목",
          "description": "string - 번역된 문서 설명"
        }
      ]
    }
  ],
  "index": {
    "title": "string - 번역된 사이트 제목",
    "tagline": "string - 번역된 한 줄 소개",
    "description": "string - 번역된 사이트 설명"
  }
}

요구사항:
- 자연스러운 ${langNames[targetLang]} 번역
- 기술 용어는 해당 언어에서 일반적으로 사용되는 표현 사용`;

	return await callGemini<TranslatedStructure>(prompt);
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

async function translateDocument(doc: DocContent, targetLang: string): Promise<DocContent> {
	const langNames: Record<string, string> = {
		zh: '简体中文',
		ja: '日本語',
		en: 'English'
	};

	const prompt = `다음 한국어 기술 문서를 ${langNames[targetLang]}로 번역하세요.

원본 (한국어):
${JSON.stringify(doc, null, 2)}

다음 JSON 형식으로 응답하세요:
{
  "frontmatter": {
    "title": "번역된 제목",
    "description": "번역된 설명"
  },
  "content": "번역된 마크다운 본문"
}

## Few-shot 예시

입력 (한국어):
{
  "frontmatter": {
    "title": "변수와 타입",
    "description": "JavaScript의 변수 선언 방법을 알아봅니다."
  },
  "content": "## 변수 선언\\n\\n변수를 선언하는 방법입니다.\\n\\n- **let**: 재할당 가능\\n- **const**: 재할당 불가"
}

출력 (${langNames[targetLang]}):
${
	targetLang === 'en'
		? `{
  "frontmatter": {
    "title": "Variables and Types",
    "description": "Learn how to declare variables in JavaScript."
  },
  "content": "## Variable Declaration\\n\\nHere's how to declare variables.\\n\\n- **let**: Can be reassigned\\n- **const**: Cannot be reassigned"
}`
		: targetLang === 'zh'
			? `{
  "frontmatter": {
    "title": "变量与类型",
    "description": "了解JavaScript中的变量声明方法。"
  },
  "content": "## 变量声明\\n\\n以下是声明变量的方法。\\n\\n- **let**: 可重新赋值\\n- **const**: 不可重新赋值"
}`
			: `{
  "frontmatter": {
    "title": "変数と型",
    "description": "JavaScriptでの変数宣言方法を学びます。"
  },
  "content": "## 変数宣言\\n\\n変数を宣言する方法です。\\n\\n- **let**: 再代入可能\\n- **const**: 再代入不可"
}`
}

요구사항:
- 자연스러운 ${langNames[targetLang]} 번역
- 마크다운 구조 유지 (##, ###, -, \`\`\` 등)
- 코드 블록 내용은 번역하지 않음 (주석만 번역)`;

	return await callGemini<DocContent>(prompt);
}

function generateIndexPage(
	structure: SiteStructure,
	translatedStructure: TranslatedStructure | null,
	locale: string
): GeneratedDoc {
	const isKorean = locale === DEFAULT_LOCALE;
	const idx = isKorean ? structure.index : translatedStructure!.index;
	const firstDoc = `/${locale}/${structure.categories[0].name}/${structure.categories[0].docs[0].slug}`;

	const actionText: Record<string, string> = {
		ko: '시작하기',
		zh: '开始使用',
		ja: '始める',
		en: 'Get Started'
	};

	const features = structure.categories.map((c, i) => {
		const label = isKorean ? c.label : translatedStructure!.categories[i].label;
		const details = isKorean
			? c.docs.map((d) => d.title).join(', ')
			: translatedStructure!.categories[i].docs.map((d) => d.title).join(', ');
		return { title: label, details };
	});

	const content = `---
layout: home

hero:
  name: "${idx.title}"
  text: "${idx.tagline}"
  tagline: "${idx.description}"
  actions:
    - theme: brand
      text: ${actionText[locale]}
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
	return { path: `docs/${locale}/index.md`, content };
}

function generateVitePressConfig(structure: SiteStructure): string {
	const localesConfig: string[] = [];

	for (const locale of LOCALES) {
		const sidebar = structure.categories.map((c) => ({
			text: c.label,
			items: c.docs.map((d) => ({ text: d.title, link: `/${locale.code}/${c.name}/${d.slug}` }))
		}));

		localesConfig.push(`    '${locale.code}': {
      label: '${locale.label}',
      lang: '${locale.lang}',
      themeConfig: {
        sidebar: ${JSON.stringify(sidebar, null, 8).replace(/^/gm, '        ').trim()}
      }
    }`);
	}

	return `import { defineConfig } from 'vitepress'
import { readFileSync } from 'fs'

const siteConfig = JSON.parse(readFileSync('./site.config.json', 'utf-8'))
const siteUrl = \`https://\${siteConfig.subdomain}.xiyo.dev\`

export default defineConfig({
  title: siteConfig.title,
  description: siteConfig.description,
  lastUpdated: siteConfig.lastUpdated,

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

  locales: {
${localesConfig.join(',\n')}
  },

  themeConfig: {
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

	console.log(`\nGenerating multi-language VitePress docs for: "${topic}"\n`);
	console.log(`Languages: ${LOCALES.map((l) => l.label).join(', ')}\n`);

	// Step 1: Generate structure (Korean)
	console.log('1. Generating structure...');
	const structure = await generateStructure(topic);

	// Step 2: Generate Korean documents
	console.log('2. Generating Korean documents...');
	const koreanDocs: { category: Category; docInfo: DocInfo; content: DocContent }[] = [];

	for (const category of structure.categories) {
		for (const doc of category.docs) {
			const content = await generateDocument(category, doc);
			koreanDocs.push({ category, docInfo: doc, content });
			console.log(`   - Generated: ${doc.title}`);
		}
	}

	// Step 3: Generate all language versions
	console.log('3. Generating translations...');
	const allDocs: GeneratedDoc[] = [];

	// Korean version
	allDocs.push(generateIndexPage(structure, null, DEFAULT_LOCALE));
	for (const { category, docInfo, content } of koreanDocs) {
		const md = `# ${content.frontmatter.title}\n\n${content.frontmatter.description}\n\n${content.content.replace(/\\n/g, '\n')}`;
		allDocs.push({
			path: `docs/${DEFAULT_LOCALE}/${category.name}/${docInfo.slug}.md`,
			content: md
		});
	}

	// Other languages
	for (const locale of LOCALES) {
		if (locale.code === DEFAULT_LOCALE) continue;

		console.log(`   - Translating to ${locale.label}...`);
		const translatedStructure = await translateStructure(structure, locale.code);

		allDocs.push(generateIndexPage(structure, translatedStructure, locale.code));

		for (let i = 0; i < koreanDocs.length; i++) {
			const { category, docInfo, content } = koreanDocs[i];
			const translatedContent = await translateDocument(content, locale.code);

			const catIndex = structure.categories.findIndex((c) => c.name === category.name);
			const docIndex = category.docs.findIndex((d) => d.slug === docInfo.slug);
			if (catIndex >= 0 && docIndex >= 0) {
				translatedContent.frontmatter.title =
					translatedStructure.categories[catIndex].docs[docIndex].title;
				translatedContent.frontmatter.description =
					translatedStructure.categories[catIndex].docs[docIndex].description;
			}

			const md = `# ${translatedContent.frontmatter.title}\n\n${translatedContent.frontmatter.description}\n\n${translatedContent.content.replace(/\\n/g, '\n')}`;
			allDocs.push({
				path: `docs/${locale.code}/${category.name}/${docInfo.slug}.md`,
				content: md
			});
		}
	}

	// Step 4: Write files
	console.log('4. Writing files...');
	const configContent = generateVitePressConfig(structure);
	await writeFiles(allDocs, configContent);

	console.log(`\nUpdate site.config.json with:`);
	console.log(`  "title": "${structure.index.title}"`);
	console.log(`  "description": "${structure.index.description}"`);

	console.log(`\nDone! Generated ${allDocs.length} documents in ${LOCALES.length} languages.`);
}

main().catch((err) => {
	console.error('Error:', err.message);
	Deno.exit(1);
});
