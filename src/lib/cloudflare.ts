const BASE_DOMAIN = 'xiyo.dev';

interface DnsRecord {
	id: string;
	name: string;
	type: string;
	content: string;
	created_on: string;
	modified_on: string;
}

export interface DeployedSite {
	subdomain: string;
	url: string;
	createdAt: string;
}

interface CloudflareResponse<T> {
	success: boolean;
	errors: { code: number; message: string }[];
	result: T;
}

export async function checkSubdomainExists(
	apiKey: string,
	email: string,
	zoneId: string,
	subdomain: string
): Promise<{ exists: boolean; error?: string }> {
	const fullDomain = `${subdomain}.${BASE_DOMAIN}`;
	const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${fullDomain}`;

	try {
		const response = await fetch(url, {
			headers: {
				'X-Auth-Key': apiKey,
				'X-Auth-Email': email,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const errorData = (await response.json()) as CloudflareResponse<never>;
			return {
				exists: false,
				error: errorData.errors?.[0]?.message || `HTTP ${response.status}`
			};
		}

		const data = (await response.json()) as CloudflareResponse<DnsRecord[]>;

		if (!data.success) {
			return {
				exists: false,
				error: data.errors?.[0]?.message || 'Unknown error'
			};
		}

		return { exists: data.result.length > 0 };
	} catch (err) {
		return {
			exists: false,
			error: err instanceof Error ? err.message : 'Network error'
		};
	}
}

// 배포된 모든 사이트 목록 조회
export async function getDeployedSites(
	apiKey: string,
	email: string,
	zoneId: string
): Promise<{ sites: DeployedSite[]; error?: string }> {
	// CNAME 레코드만 조회 (서브도메인 사이트들)
	const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=CNAME&per_page=100`;

	try {
		const response = await fetch(url, {
			headers: {
				'X-Auth-Key': apiKey,
				'X-Auth-Email': email,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const errorData = (await response.json()) as CloudflareResponse<never>;
			return {
				sites: [],
				error: errorData.errors?.[0]?.message || `HTTP ${response.status}`
			};
		}

		const data = (await response.json()) as CloudflareResponse<DnsRecord[]>;

		if (!data.success) {
			return {
				sites: [],
				error: data.errors?.[0]?.message || 'Unknown error'
			};
		}

		// xiyo.dev 서브도메인만 필터링하고 변환
		const sites: DeployedSite[] = data.result
			.filter((record) => record.name.endsWith(`.${BASE_DOMAIN}`) && record.name !== BASE_DOMAIN)
			.map((record) => ({
				subdomain: record.name.replace(`.${BASE_DOMAIN}`, ''),
				url: `https://${record.name}`,
				createdAt: record.created_on
			}))
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

		return { sites };
	} catch (err) {
		return {
			sites: [],
			error: err instanceof Error ? err.message : 'Network error'
		};
	}
}
