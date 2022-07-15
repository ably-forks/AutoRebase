import {GitHub} from '@actions/github';
import {MergeableState} from '../../pullrequestinfo';

export interface GetPullRequestService {
    getPullRequest(ownerName: string, repoName: string, pullRequestNumber: number): Promise<ApiGetPullRequest>;
}

export interface ApiGetPullRequest {
    draft: boolean;
    rebaseable: boolean;
    mergeableState: MergeableState;
    autoMerge: boolean;
    labels: string[];
}

export class GithubGetPullRequestService implements GetPullRequestService {
    constructor(private github: GitHub) {}

    public async getPullRequest(
        ownerName: string,
        repoName: string,
        pullRequestNumber: number,
    ): Promise<ApiGetPullRequest> {
        const result = await this.github.pulls.get({
            owner: ownerName,
            repo: repoName,
            pull_number: pullRequestNumber,
        });

        // hacky, auto_merge not yet in the typings
        const data = result.data as typeof result.data & {auto_merge: boolean};

        return {
            draft: data.draft,
            rebaseable: data.rebaseable,
            mergeableState: data.mergeable_state as MergeableState,
            autoMerge: data.auto_merge,
            labels: data.labels.map((label) => label.name),
        };
    }
}
