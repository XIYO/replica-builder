export interface WorkflowInputs {
	subdomain: string;
	title: string;
	topic: string;
	accent_color: string;
}

interface GitHubErrorResponse {
	message: string;
	documentation_url?: string;
}

type TriggerResult = { success: true } | { success: false; error: string; status: number };

export async function triggerWorkflowDispatch(
	token: string,
	owner: string,
	repo: string,
	workflowId: string,
	inputs: WorkflowInputs
): Promise<TriggerResult> {
	const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: `Bearer ${token}`,
			'User-Agent': 'Replica-Builder'
		},
		body: JSON.stringify({
			ref: 'main',
			inputs
		})
	});

	if (response.status === 204) {
		return { success: true };
	}

	const errorData = (await response.json()) as GitHubErrorResponse;
	return {
		success: false,
		error: errorData.message,
		status: response.status
	};
}
