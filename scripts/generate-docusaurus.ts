/**
 * Deno script for generating Docusaurus documentation content using Gemini API
 * with multi-language support (ko, zh, ja, en)
 * Usage: deno run --allow-net --allow-write --allow-env --allow-read generate-docusaurus.ts "주제"
 */

// Language configuration
const LOCALES = [
	{ code: 'ko', label: '한국어', lang: 'ko' },
	{ code: 'zh-Hans', label: '简体中文', lang: 'zh-Hans' },
	{ code: 'ja', label: '日本語', lang: 'ja' },
	{ code: 'en', label: 'English', lang: 'en' }
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
	title: string;
	description: string;
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

async function translateStructure(
	structure: SiteStructure,
	targetLang: string
): Promise<TranslatedStructure> {
	const langNames: Record<string, string> = {
		'zh-Hans': '简体中文',
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

async function generateDocument(category: Category, doc: DocInfo, position: number): Promise<{ content: DocContent; position: number }> {
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
	return { content: result, position };
}

async function translateDocument(doc: DocContent, targetLang: string): Promise<DocContent> {
	const langNames: Record<string, string> = {
		'zh-Hans': '简体中文',
		ja: '日本語',
		en: 'English'
	};

	const prompt = `다음 한국어 기술 문서를 ${langNames[targetLang]}로 번역하세요.

원본 (한국어):
${JSON.stringify(doc, null, 2)}

다음 JSON 형식으로 응답하세요:
{
  "title": "번역된 제목",
  "description": "번역된 설명",
  "content": "번역된 마크다운 본문"
}

## Few-shot 예시

입력 (한국어):
{
  "title": "변수와 타입",
  "description": "JavaScript의 변수 선언 방법을 알아봅니다.",
  "content": "## 변수 선언\\n\\n변수를 선언하는 방법입니다.\\n\\n- **let**: 재할당 가능\\n- **const**: 재할당 불가"
}

출력 (${langNames[targetLang]}):
${
	targetLang === 'en'
		? `{
  "title": "Variables and Types",
  "description": "Learn how to declare variables in JavaScript.",
  "content": "## Variable Declaration\\n\\nHere's how to declare variables.\\n\\n- **let**: Can be reassigned\\n- **const**: Cannot be reassigned"
}`
		: targetLang === 'zh-Hans'
			? `{
  "title": "变量与类型",
  "description": "了解JavaScript中的变量声明方法。",
  "content": "## 变量声明\\n\\n以下是声明变量的方法。\\n\\n- **let**: 可重新赋值\\n- **const**: 不可重新赋值"
}`
			: `{
  "title": "変数と型",
  "description": "JavaScriptでの変数宣言方法を学びます。",
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
	const isDefault = locale === DEFAULT_LOCALE;
	const idx = isDefault ? structure.index : translatedStructure!.index;
	const cats = isDefault
		? structure.categories
		: structure.categories.map((c, i) => ({
				...c,
				label: translatedStructure!.categories[i].label,
				docs: c.docs.map((d, j) => ({
					...d,
					title: translatedStructure!.categories[i].docs[j].title,
					description: translatedStructure!.categories[i].docs[j].description
				}))
			}));

	const content = `---
slug: /
sidebar_position: 1
---

# ${idx.title}

${idx.description}

## ${isDefault ? '무엇을 다루나요?' : locale === 'en' ? 'What does this cover?' : locale === 'zh-Hans' ? '涵盖内容' : '内容について'}

${cats.map((c) => `### ${c.label}\n\n${c.docs.map((d) => `- **${d.title}** - ${d.description}`).join('\n')}`).join('\n\n')}

${isDefault ? '지금 바로 탐색을 시작하세요!' : locale === 'en' ? 'Start exploring now!' : locale === 'zh-Hans' ? '立即开始探索！' : '今すぐ探索を始めましょう！'}
`;

	const path = isDefault ? 'docs/index.md' : `i18n/${locale}/docusaurus-plugin-content-docs/current/index.md`;
	return { path, content };
}

function generateCategoryMeta(
	category: Category,
	translatedLabel: string | null,
	position: number,
	locale: string
): GeneratedDoc {
	const label = translatedLabel || category.label;
	const content = `{
  "label": "${label}",
  "position": ${position},
  "link": {
    "type": "generated-index",
    "description": "${category.docs.map((d) => d.title).join(', ')}"
  }
}
`;
	const path =
		locale === DEFAULT_LOCALE
			? `docs/${category.name}/_category_.json`
			: `i18n/${locale}/docusaurus-plugin-content-docs/current/${category.name}/_category_.json`;
	return { path, content };
}

function generateDocFile(
	category: Category,
	docInfo: DocInfo,
	docContent: DocContent,
	position: number,
	locale: string
): GeneratedDoc {
	const md = `---
sidebar_position: ${position}
---

# ${docContent.title}

${docContent.description}

${docContent.content.replace(/\\n/g, '\n')}`;

	const path =
		locale === DEFAULT_LOCALE
			? `docs/${category.name}/${docInfo.slug}.md`
			: `i18n/${locale}/docusaurus-plugin-content-docs/current/${category.name}/${docInfo.slug}.md`;
	return { path, content: md };
}

function generateHomepageFeatures(
	structure: SiteStructure,
	translatedStructures: Map<string, TranslatedStructure>
): string {
	// Use Korean labels for the component (will be displayed in Korean)
	return `import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
${structure.categories.map((c, i) => `  {
    title: '${c.label}',
    Svg: require('@site/static/img/undraw_docusaurus_${i === 0 ? 'mountain' : 'tree'}.svg').default,
    description: (
      <>
        ${c.docs.map((d) => d.title).join(', ')}
      </>
    ),
  },`).join('\n')}
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--6')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
`;
}

async function writeFiles(docs: GeneratedDoc[], homepageFeatures: string) {
	for (const doc of docs) {
		const dir = doc.path.substring(0, doc.path.lastIndexOf('/'));
		await Deno.mkdir(dir, { recursive: true });
		await Deno.writeTextFile(doc.path, doc.content);
		console.log(`Created: ${doc.path}`);
	}
	await Deno.writeTextFile('src/components/HomepageFeatures/index.tsx', homepageFeatures);
	console.log('Updated: src/components/HomepageFeatures/index.tsx');
}

async function main() {
	const topic = Deno.args[0];
	if (!topic) {
		console.error('Usage: deno run generate-docusaurus.ts <topic>');
		Deno.exit(1);
	}

	console.log(`\nGenerating multi-language Docusaurus docs for: "${topic}"\n`);
	console.log(`Languages: ${LOCALES.map((l) => l.label).join(', ')}\n`);

	// Step 1: Generate structure
	console.log('1. Generating structure...');
	const structure = await generateStructure(topic);

	// Step 2: Generate Korean documents
	console.log('2. Generating Korean documents...');
	const koreanDocs: { category: Category; docInfo: DocInfo; content: DocContent; position: number }[] = [];

	for (let i = 0; i < structure.categories.length; i++) {
		const cat = structure.categories[i];
		for (let j = 0; j < cat.docs.length; j++) {
			const { content, position } = await generateDocument(cat, cat.docs[j], j + 1);
			koreanDocs.push({ category: cat, docInfo: cat.docs[j], content, position });
			console.log(`   - Generated: ${cat.docs[j].title}`);
		}
	}

	// Step 3: Translate and generate all files
	console.log('3. Generating translations...');
	const allDocs: GeneratedDoc[] = [];
	const translatedStructures = new Map<string, TranslatedStructure>();

	// Korean (default) files
	allDocs.push(generateIndexPage(structure, null, DEFAULT_LOCALE));
	for (let i = 0; i < structure.categories.length; i++) {
		allDocs.push(generateCategoryMeta(structure.categories[i], null, i + 2, DEFAULT_LOCALE));
	}
	for (const { category, docInfo, content, position } of koreanDocs) {
		allDocs.push(generateDocFile(category, docInfo, content, position, DEFAULT_LOCALE));
	}

	// Other languages
	for (const locale of LOCALES) {
		if (locale.code === DEFAULT_LOCALE) continue;

		console.log(`   - Translating to ${locale.label}...`);
		const translatedStructure = await translateStructure(structure, locale.code);
		translatedStructures.set(locale.code, translatedStructure);

		// Index page
		allDocs.push(generateIndexPage(structure, translatedStructure, locale.code));

		// Category meta files
		for (let i = 0; i < structure.categories.length; i++) {
			allDocs.push(
				generateCategoryMeta(
					structure.categories[i],
					translatedStructure.categories[i].label,
					i + 2,
					locale.code
				)
			);
		}

		// Documents
		for (let i = 0; i < koreanDocs.length; i++) {
			const { category, docInfo, content, position } = koreanDocs[i];
			const translatedContent = await translateDocument(content, locale.code);

			const catIndex = structure.categories.findIndex((c) => c.name === category.name);
			const docIndex = category.docs.findIndex((d) => d.slug === docInfo.slug);
			if (catIndex >= 0 && docIndex >= 0) {
				translatedContent.title = translatedStructure.categories[catIndex].docs[docIndex].title;
				translatedContent.description = translatedStructure.categories[catIndex].docs[docIndex].description;
			}

			allDocs.push(generateDocFile(category, docInfo, translatedContent, position, locale.code));
		}
	}

	// Step 4: Write files
	console.log('4. Writing files...');
	const homepageFeatures = generateHomepageFeatures(structure, translatedStructures);
	await writeFiles(allDocs, homepageFeatures);

	console.log(`\nUpdate site.config.json with:`);
	console.log(`  "title": "${structure.index.title}"`);
	console.log(`  "description": "${structure.index.tagline}"`);

	console.log(`\nDone! Generated ${allDocs.length} documents in ${LOCALES.length} languages.`);
}

main().catch((err) => {
	console.error('Error:', err.message);
	Deno.exit(1);
});
