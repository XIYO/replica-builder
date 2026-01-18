import { json, error } from '@sveltejs/kit';
import { checkSubdomainExists } from '$lib/cloudflare';
import type { RequestHandler } from './$types';

const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export const GET: RequestHandler = async ({ params, platform }) => {
	const apiKey = platform?.env?.CLOUDFLARE_API_KEY;
	const email = platform?.env?.CLOUDFLARE_EMAIL;
	const zoneId = platform?.env?.CLOUDFLARE_ZONE_ID;

	if (!apiKey || !email || !zoneId) {
		error(500, 'Cloudflare 환경변수가 설정되지 않았습니다.');
	}

	const { subdomain } = params;

	if (!subdomain || !SUBDOMAIN_REGEX.test(subdomain)) {
		return json({
			available: false,
			error: '유효하지 않은 서브도메인 형식입니다. 소문자, 숫자, 하이픈만 사용 가능합니다.'
		});
	}

	const result = await checkSubdomainExists(apiKey, email, zoneId, subdomain);

	if (result.error) {
		error(500, result.error);
	}

	return json({
		available: !result.exists,
		subdomain,
		fullDomain: `${subdomain}.xiyo.dev`
	});
};
