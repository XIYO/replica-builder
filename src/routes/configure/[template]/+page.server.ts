import { error } from '@sveltejs/kit';
import yaml from 'js-yaml';
import { getTemplateById } from '$lib/data/templates';
import type { SchemaField } from '$lib/data/types';
import type { PageServerLoad } from './$types';

interface Schema {
	fields: SchemaField[];
}

export const load: PageServerLoad = async ({ params, fetch }) => {
	const template = getTemplateById(params.template);

	if (!template) {
		error(404, '템플릿을 찾을 수 없습니다.');
	}

	const response = await fetch(template.schemaUrl);
	if (!response.ok) {
		error(500, '스키마를 불러올 수 없습니다.');
	}

	const yamlText = await response.text();
	const schema = yaml.load(yamlText) as Schema;

	return {
		template,
		fields: schema.fields || []
	};
};
