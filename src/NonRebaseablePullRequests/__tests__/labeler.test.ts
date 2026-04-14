import {Labeler, LabelPullRequestService} from '../labeler';
import {OpenPullRequestsProvider} from '../../EligiblePullRequests/testableEligiblePullRequestsRetriever';
import {PullRequestInfo} from '../../pullrequestinfo';
import {NON_REBASEABLE_LABEL, OPT_IN_LABEL} from '../../labels';

const pullRequests: Map<number, PullRequestInfo> = new Map();

class TestOpenPullRequestsProvider implements OpenPullRequestsProvider {
    async openPullRequests(ownerName: string, repoName: string): Promise<PullRequestInfo[]> {
        return Array.from(pullRequests.values());
    }
}

class TestLabelPullRequestService implements LabelPullRequestService {
    async listLabels(ownerName: string, repoName: string): Promise<string[]> {
        return [];
    }

    async createLabel(
        ownerName: string,
        repoName: string,
        label: string,
        color: string,
        description: string,
    ): Promise<void> {}

    async addLabel(ownerName: string, repoName: string, pullRequestNumber: number, label: string): Promise<void> {
        const pullRequest = pullRequests.get(pullRequestNumber)!;
        pullRequest.labels.push(label);
    }

    async removeLabel(ownerName: string, repoName: string, pullRequestNumber: number, label: string): Promise<void> {
        const pullRequest = pullRequests.get(pullRequestNumber)!;
        pullRequest.labels = pullRequest.labels.filter((value) => value !== label);
    }
}

const labelPullRequestService = new TestLabelPullRequestService();
const labeler = new Labeler(new TestOpenPullRequestsProvider(), labelPullRequestService);

describe('A pull request gets labeled when', () => {
    it('it has merge conflicts', async () => {
        /* Given */
        pullRequests.set(3, {
            ownerName: 'owner',
            repoName: 'repo',
            number: 3,
            draft: false,
            mergeableState: 'dirty',
            labels: [],
            autoMerge: true,
        });

        /* When */
        await labeler.labelNonRebaseablePullRequests('owner', 'repo');

        /* Then */
        expect(pullRequests.get(3)!.labels).toContain(NON_REBASEABLE_LABEL);
    });
});

describe('A pull request does not get labeled when', () => {
    it('it does not have merge conflicts', async () => {
        /* Given */
        pullRequests.set(3, {
            ownerName: 'owner',
            repoName: 'repo',
            number: 3,
            draft: false,
            mergeableState: 'behind',
            autoMerge: true,
            labels: [],
        });

        const addLabelSpy = spyOn(labelPullRequestService, 'addLabel');

        /* When */
        await labeler.labelNonRebaseablePullRequests('owner', 'repo');

        /* Then */
        expect(addLabelSpy).not.toHaveBeenCalled();
    });

    it('it has merge conflicts but it already has the label', async () => {
        /* Given */
        pullRequests.set(3, {
            ownerName: 'owner',
            repoName: 'repo',
            number: 3,
            draft: false,
            mergeableState: 'dirty',
            autoMerge: true,
            labels: [NON_REBASEABLE_LABEL],
        });

        const addLabelSpy = spyOn(labelPullRequestService, 'addLabel');

        /* When */
        await labeler.labelNonRebaseablePullRequests('owner', 'repo');

        /* Then */
        expect(addLabelSpy).not.toHaveBeenCalled();
    });

    it('it was recently rebased', async () => {
        /* Given */
        pullRequests.set(3, {
            ownerName: 'owner',
            repoName: 'repo',
            number: 3,
            draft: false,
            mergeableState: 'dirty',
            autoMerge: true,
            labels: [],
        });

        const addLabelSpy = spyOn(labelPullRequestService, 'addLabel');

        /* When */
        await labeler.labelNonRebaseablePullRequests('owner', 'repo', new Set([3]));

        /* Then */
        expect(addLabelSpy).not.toHaveBeenCalled();
    });

    it('it does not have automerge enabled', async () => {
        /* Given */
        pullRequests.set(3, {
            ownerName: 'owner',
            repoName: 'repo',
            number: 3,
            draft: false,
            mergeableState: 'dirty',
            autoMerge: false,
            labels: [],
        });

        const addLabelSpy = spyOn(labelPullRequestService, 'addLabel');

        /* When */
        await labeler.labelNonRebaseablePullRequests('owner', 'repo');

        /* Then */
        expect(addLabelSpy).not.toHaveBeenCalled();
    });
});

describe('The label gets removed from a pull request when', () => {
    it('it no longer has merge conflicts', async () => {
        /* Given */
        pullRequests.set(3, {
            ownerName: 'owner',
            repoName: 'repo',
            number: 3,
            draft: false,
            mergeableState: 'behind',
            autoMerge: true,
            labels: [NON_REBASEABLE_LABEL],
        });

        /* When */
        await labeler.labelNonRebaseablePullRequests('owner', 'repo');

        /* Then */
        expect(pullRequests.get(3)!.labels).toStrictEqual([]);
    });
});

describe('The label does not get removed from a pull request when', () => {
    it('it still has merge conflicts', async () => {
        /* Given */
        pullRequests.set(3, {
            ownerName: 'owner',
            repoName: 'repo',
            number: 3,
            draft: false,
            mergeableState: 'dirty',
            autoMerge: true,
            labels: [NON_REBASEABLE_LABEL],
        });

        /* When */
        await labeler.labelNonRebaseablePullRequests('owner', 'repo');

        /* Then */
        expect(pullRequests.get(3)!.labels).toStrictEqual([NON_REBASEABLE_LABEL]);
    });

    it('it does not have the label', async () => {
        /* Given */
        pullRequests.set(3, {
            ownerName: 'owner',
            repoName: 'repo',
            number: 3,
            draft: false,
            mergeableState: 'behind',
            autoMerge: true,
            labels: [],
        });

        const removeLabelSpy = spyOn(labelPullRequestService, 'removeLabel');

        /* When */
        await labeler.labelNonRebaseablePullRequests('owner', 'repo');

        /* Then */
        expect(removeLabelSpy).not.toHaveBeenCalled();
    });
});
