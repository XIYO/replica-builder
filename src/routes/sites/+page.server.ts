import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const GITHUB_API = 'https://api.github.com';
const OWNER = 'xiyo';

interface Repo {
	name: string;
	created_at: string;
	html_url: string;
}

interface Variable {
	name: string;
	value: string;
}

export interface DeployedSite {
	subdomain: string;
	url: string;
	repoName: string;
	repoUrl: string;
	createdAt: string;
	template: string;
}

function githubHeaders(token: string) {
	return {
		Accept: 'application/vnd.github+json',
		Authorization: `Bearer ${token}`,
		'User-Agent': 'Replica-Builder'
	};
}

async function fetchSites(token: string): Promise<DeployedSite[]> {
	// replica-template-* repos 조회
	const reposResponse = await fetch(
		`${GITHUB_API}/users/${OWNER}/repos?sort=created&per_page=100`,
		{ headers: githubHeaders(token) }
	);

	if (!reposResponse.ok) {
		throw new Error('GitHub repos 조회 실패');
	}

	const repos = (await reposResponse.json()) as Repo[];

	// replica-template-XX-YYYYMMDD 패턴 필터링
	const templateRepos = repos.filter((repo) => /^replica-template-\d{2}-\d{14}$/.test(repo.name));

	// 각 repo의 SITE_SUBDOMAIN 변수 조회
	const sites: DeployedSite[] = [];

	await Promise.all(
		templateRepos.map(async (repo) => {
			try {
				const varsResponse = await fetch(
					`${GITHUB_API}/repos/${OWNER}/${repo.name}/actions/variables`,
					{ headers: githubHeaders(token) }
				);

				if (!varsResponse.ok) return;

				const varsData = (await varsResponse.json()) as { variables: Variable[] };
				const subdomainVar = varsData.variables.find((v) => v.name === 'SITE_SUBDOMAIN');

				if (subdomainVar) {
					const templateMatch = repo.name.match(/replica-template-(\d{2})/);
					const templateNum = templateMatch ? templateMatch[1] : '00';

					sites.push({
						subdomain: subdomainVar.value,
						url: `https://${subdomainVar.value}.xiyo.dev`,
						repoName: repo.name,
						repoUrl: repo.html_url,
						createdAt: repo.created_at,
						template: `template-${templateNum}`
					});
				}
			} catch {
				// 개별 repo 조회 실패 무시
			}
		})
	);

	// 생성일 기준 내림차순 정렬
	sites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	return sites;
}

export const load: PageServerLoad = async ({ platform }) => {
	const token = platform?.env?.GITHUB_TOKEN;

	if (!token) {
		error(500, 'GITHUB_TOKEN 환경변수가 설정되지 않았습니다.');
	}

	// Promise를 await 하지 않고 반환 → 스트리밍
	return {
		sites: fetchSites(token)
	};
};
