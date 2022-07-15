import {GetPullRequestService} from './Api/getPullRequestService';
import {mergeableStates, PullRequestInfo} from '../pullrequestinfo';
import {debug, info} from '@actions/core';
import {promiseRetry} from '../Util/promiseRetry';

export class GithubPullRequestInfoProvider {
    constructor(private getPullRequestService: GetPullRequestService) {}

    public pullRequestInfoFor(
        ownerName: string,
        repoName: string,
        pullRequestNumber: number,
    ): Promise<PullRequestInfo> {
        return promiseRetry<PullRequestInfo>(
            async (attemptNumber): Promise<PullRequestInfo> => {
                try {
                    const {
                        draft,
                        rebaseable,
                        mergeableState,
                        labels,
                        autoMerge,
                    } = await this.getPullRequestService.getPullRequest(ownerName, repoName, pullRequestNumber);

                    if (attemptNumber < 10 && !draft) {
                        if (mergeableState === 'unknown' || !mergeableStates.includes(mergeableState)) {
                            info(
                                `${new Date().toString()}: mergeableState for pull request #${pullRequestNumber} is '${mergeableState}', retrying; attemptNumber = ${attemptNumber}.`,
                            );
                            throw Error("mergeableState is 'unknown'");
                        }
                    }

                    debug(`rebaseable value for pull request #${pullRequestNumber}: ${String(rebaseable)}`);
                    debug(`mergeableState for pull request #${pullRequestNumber}: ${mergeableState}`);
                    debug(`autoMerge for pull request #${pullRequestNumber}: ${String(autoMerge)}`);

                    return {
                        ownerName: ownerName,
                        repoName: repoName,
                        number: pullRequestNumber,
                        draft: draft,
                        rebaseable: rebaseable,
                        mergeableState: mergeableState,
                        autoMerge: autoMerge,
                        labels: labels,
                    };
                } catch (error) {
                    debug(
                        `Fetching mergeableState for pull request #${pullRequestNumber} failed: "${String(
                            error,
                        )}", retrying.`,
                    );
                    throw error;
                }
            },
            {timeoutMs: 1000},
        );
    }
}
