export interface Template {
	id: string;
	name: string;
	framework: string;
	description: string;
	schemaUrl: string;
}

export const templates: Template[] = [
	{
		id: 'replica-template-00',
		name: 'Starlight',
		framework: 'Astro',
		description: 'Starlight 기반 문서 사이트',
		schemaUrl: 'https://raw.githubusercontent.com/XIYO/replica-template-00/main/config.schema.yaml'
	},
	{
		id: 'replica-template-01',
		name: 'VitePress',
		framework: 'Vue',
		description: 'VitePress 기반 문서 사이트',
		schemaUrl: 'https://raw.githubusercontent.com/XIYO/replica-template-01/main/config.schema.yaml'
	},
	{
		id: 'replica-template-02',
		name: 'Docusaurus',
		framework: 'React',
		description: 'Docusaurus 기반 문서 사이트',
		schemaUrl: 'https://raw.githubusercontent.com/XIYO/replica-template-02/main/config.schema.yaml'
	}
];

export function getTemplateById(id: string) {
	return templates.find((t) => t.id === id);
}
