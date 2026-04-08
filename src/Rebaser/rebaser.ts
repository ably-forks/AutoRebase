import {PullRequestInfo} from '../pullrequestinfo';
import {info, warning} from '@actions/core';
import {GithubRebase} from './githubRebase';

/**
 * Uses [github-rebase](https://github.com/tibdex/github-rebase)
 * to rebase pull requests.
 */
export class Rebaser {
    private githubRebase: GithubRebase;

    constructor(githubRebase: GithubRebase) {
        this.githubRebase = githubRebase;
    }

    public async rebasePullRequests(pullRequests: PullRequestInfo[]): Promise<Set<number>> {
        const rebased = new Set<number>();
        for (const pullRequest of pullRequests) {
            if (await this.rebase(pullRequest)) {
                rebased.add(pullRequest.number);
            }
        }
        return rebased;
    }

    private async rebase(pullRequest: PullRequestInfo): Promise<boolean> {
        info(`Rebasing pull request ${JSON.stringify(pullRequest)}`);
        try {
            await this.githubRebase.rebasePullRequest(pullRequest.ownerName, pullRequest.number, pullRequest.repoName);

            info(`${JSON.stringify(pullRequest)} was successfully rebased.`);
            return true;
        } catch (e) {
            if (String(e).includes('Rebase aborted because the head branch changed')) {
                warning(`Rebase aborted because the head branch changed for ${JSON.stringify(pullRequest)}`);
                return false;
            }
            throw new Error(`Error while rebasing for ${JSON.stringify(pullRequest)}: ${String(e)}`);
        }
    }
}
