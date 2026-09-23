import { fireEvent, waitFor } from '@testing-library/react';
import { CommitForm, CommitFormProps } from 'dogma/common/components/CommitForm';
import { renderWithProviders } from 'dogma/util/test-utils';

const mockUnwrap = jest.fn();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockPush = jest.fn((..._args: unknown[]) => ({ unwrap: mockUnwrap }));

// The ESM-only 'yaml' package cannot be loaded by Jest. YAML files are not covered by these tests.
jest.mock('yaml', () => ({ __esModule: true, default: { parse: jest.fn(), stringify: jest.fn() } }));

jest.mock('dogma/features/api/apiSlice', () => {
  const actual = jest.requireActual('dogma/features/api/apiSlice');
  return {
    ...actual,
    usePushFileChangesMutation: () => [mockPush, { isLoading: false }],
  };
});

function renderCommitForm(props: Partial<CommitFormProps>) {
  const defaultProps: CommitFormProps = {
    projectName: 'foo',
    repoName: 'bar',
    path: '/a/b.json',
    name: 'b.json',
    content: () => '{"a": 1}',
    readOnly: false,
    setReadOnly: jest.fn(),
    switchMode: jest.fn(),
    handleTabChange: jest.fn(),
  };
  const merged = { ...defaultProps, ...props };
  const result = renderWithProviders(<CommitForm {...merged} />);
  fireEvent.change(result.getByPlaceholderText('Add a summary'), { target: { value: 'Commit' } });
  fireEvent.click(result.getByRole('button', { name: 'Commit' }));
  return merged;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pushedChanges(): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mockPush.mock.calls[0][0] as any).data.changes;
}

describe('CommitForm', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUnwrap.mockReset();
    mockUnwrap.mockResolvedValue({});
  });

  it('upserts the file when it is not renamed', async () => {
    const onRenamed = jest.fn();
    renderCommitForm({ newName: 'b.json', onRenamed });

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    expect(pushedChanges()).toEqual([{ path: '/a/b.json', type: 'UPSERT_JSON', rawContent: '{"a": 1}' }]);
    expect(onRenamed).not.toHaveBeenCalled();
  });

  it('renames and upserts the file in a single commit', async () => {
    const onRenamed = jest.fn();
    renderCommitForm({ newName: 'c.json5', onRenamed });

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    expect(pushedChanges()).toEqual([
      { path: '/a/b.json', type: 'RENAME', content: '/a/c.json5' },
      { path: '/a/c.json5', type: 'UPSERT_JSON', rawContent: '{"a": 1}' },
    ]);
    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('/a/c.json5'));
  });

  it('updates the old file before renaming when the entry type changes', async () => {
    renderCommitForm({ path: '/a/b.txt', name: 'b.txt', newName: 'b.json' });

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    expect(pushedChanges()).toEqual([
      { path: '/a/b.txt', type: 'UPSERT_TEXT', rawContent: '{"a": 1}' },
      { path: '/a/b.txt', type: 'RENAME', content: '/a/b.json' },
      { path: '/a/b.json', type: 'UPSERT_JSON', rawContent: '{"a": 1}' },
    ]);
  });

  it('renames a JSON file to a text file without updating the old file', async () => {
    renderCommitForm({ newName: 'b.txt', content: () => 'plain text' });

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    expect(pushedChanges()).toEqual([
      { path: '/a/b.json', type: 'RENAME', content: '/a/b.txt' },
      { path: '/a/b.txt', type: 'UPSERT_TEXT', rawContent: 'plain text' },
    ]);
  });

  it('does not push when the new file name is invalid', async () => {
    renderCommitForm({ newName: 'c/d.json' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not push when the content is invalid for the new file type', async () => {
    renderCommitForm({ path: '/a/b.txt', name: 'b.txt', newName: 'b.json', content: () => 'not json' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
