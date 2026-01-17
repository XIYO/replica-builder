/**
 * Deno script for generating Docusaurus documentation content using Gemini API
 * Usage: deno run --allow-net --allow-write --allow-env --allow-read generate-docusaurus.ts "주제"
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

async function generateDocument(structure: SiteStructure, category: Category, doc: DocInfo, position: number): Promise<GeneratedDoc> {
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
	const md = `---
sidebar_position: ${position}
---

# ${result.title}

${result.description}

${result.content}`;
	return { path: `docs/${category.name}/${doc.slug}.md`, content: md };
}

async function generateIndexPage(structure: SiteStructure): Promise<GeneratedDoc> {
	const content = `---
slug: /
sidebar_position: 1
---

# ${structure.index.title}

${structure.index.description}

## 무엇을 다루나요?

${structure.categories.map(c => `### ${c.label}\n\n${c.docs.map(d => `- **${d.title}** - ${d.description}`).join('\n')}`).join('\n\n')}

지금 바로 탐색을 시작하세요!
`;
	return { path: 'docs/index.md', content };
}

function generateCategoryMeta(category: Category, position: number): GeneratedDoc {
	const content = `{
  "label": "${category.label}",
  "position": ${position},
  "link": {
    "type": "generated-index",
    "description": "${category.docs.map(d => d.title).join(', ')}"
  }
}
`;
	return { path: `docs/${category.name}/_category_.json`, content };
}

function generateHomepageFeatures(structure: SiteStructure): string {
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
        ${c.docs.map(d => d.title).join(', ')}
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

	console.log(`\nGenerating Docusaurus docs for: "${topic}"\n`);

	console.log('1. Generating structure...');
	const structure = await generateStructure(topic);

	console.log('2. Generating documents...');
	const docs: GeneratedDoc[] = [await generateIndexPage(structure)];

	for (let i = 0; i < structure.categories.length; i++) {
		const cat = structure.categories[i];
		docs.push(generateCategoryMeta(cat, i + 2));
		for (let j = 0; j < cat.docs.length; j++) {
			docs.push(await generateDocument(structure, cat, cat.docs[j], j + 1));
		}
	}

	console.log('3. Writing files...');
	const homepageFeatures = generateHomepageFeatures(structure);
	await writeFiles(docs, homepageFeatures);

	console.log(`\nUpdate site.config.json with:`);
	console.log(`  "title": "${structure.index.title}"`);
	console.log(`  "description": "${structure.index.tagline}"`);

	console.log('\nDone!');
}

main().catch(err => {
	console.error('Error:', err.message);
	Deno.exit(1);
});
