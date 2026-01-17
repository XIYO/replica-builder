export interface SchemaField {
	name: string;
	type: string;
	label: string;
	description?: string;
	required?: boolean;
	default?: string | boolean;
	placeholder?: string;
	options?: { value: string; label: string }[];
	validation?: { pattern: string; message: string };
}

export interface ConfigFormData {
	template: string;
	fields: SchemaField[];
	values: Record<string, string | boolean>;
}
