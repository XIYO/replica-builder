import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	return {
		subdomain: params.subdomain
	};
};
