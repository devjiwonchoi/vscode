/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { FoldingModel, updateFoldingStateAtIndex } from 'vs/workbench/contrib/notebook/browser/contrib/fold/foldingModel';
import { NotebookCellSelectionCollection } from 'vs/workbench/contrib/notebook/browser/viewModel/cellSelectionCollection';
import { CellKind, SelectionStateType } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { createNotebookCellList, setupInstantiationService, withTestNotebook } from 'vs/workbench/contrib/notebook/test/testNotebookEditor';

suite('NotebookSelection', () => {
	test('focus is never empty', function () {
		const selectionCollection = new NotebookCellSelectionCollection();
		assert.deepStrictEqual(selectionCollection.focus, { start: 0, end: 0 });

		selectionCollection.setState(null, [], true, 'model');
		assert.deepStrictEqual(selectionCollection.focus, { start: 0, end: 0 });
	});
});

suite('NotebookCellList focus/selection', () => {
	const instantiationService = setupInstantiationService();

	test('notebook cell list setFocus', function () {
		withTestNotebook(
			instantiationService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], {}],
				['var b = 2;', 'javascript', CellKind.Code, [], {}]
			],
			(editor, viewModel) => {
				const cellList = createNotebookCellList(instantiationService);
				cellList.attachViewModel(viewModel);

				assert.strictEqual(cellList.length, 2);
				cellList.setFocus([0]);
				assert.deepStrictEqual(viewModel.getFocus(), { start: 0, end: 1 });

				cellList.setFocus([1]);
				assert.deepStrictEqual(viewModel.getFocus(), { start: 1, end: 2 });
				cellList.detachViewModel();
			});
	});

	test('notebook cell list setSelections', function () {
		withTestNotebook(
			instantiationService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], {}],
				['var b = 2;', 'javascript', CellKind.Code, [], {}]
			],
			(editor, viewModel) => {
				const cellList = createNotebookCellList(instantiationService);
				cellList.attachViewModel(viewModel);

				assert.strictEqual(cellList.length, 2);
				cellList.setSelection([0]);
				// the only selection is also the focus
				assert.deepStrictEqual(viewModel.getSelections(), [{ start: 0, end: 1 }]);

				// set selection does not modify focus
				cellList.setSelection([1]);
				assert.deepStrictEqual(viewModel.getSelections(), [{ start: 1, end: 2 }]);
			});
	});

	test('notebook cell list setFocus', function () {
		withTestNotebook(
			instantiationService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], {}],
				['var b = 2;', 'javascript', CellKind.Code, [], {}]
			],
			(editor, viewModel) => {
				const cellList = createNotebookCellList(instantiationService);
				cellList.attachViewModel(viewModel);

				assert.strictEqual(cellList.length, 2);
				cellList.setFocus([0]);
				assert.deepStrictEqual(viewModel.getFocus(), { start: 0, end: 1 });

				cellList.setFocus([1]);
				assert.deepStrictEqual(viewModel.getFocus(), { start: 1, end: 2 });

				cellList.setSelection([1]);
				assert.deepStrictEqual(viewModel.getSelections(), [{ start: 1, end: 2 }]);
			});
	});


	test('notebook cell list focus/selection from UI', function () {
		withTestNotebook(
			instantiationService,
			[
				['# header a', 'markdown', CellKind.Markdown, [], {}],
				['var b = 1;', 'javascript', CellKind.Code, [], {}],
				['# header b', 'markdown', CellKind.Markdown, [], {}],
				['var b = 2;', 'javascript', CellKind.Code, [], {}],
				['# header c', 'markdown', CellKind.Markdown, [], {}]
			],
			(editor, viewModel) => {
				const cellList = createNotebookCellList(instantiationService);
				cellList.attachViewModel(viewModel);
				assert.deepStrictEqual(viewModel.getFocus(), { start: 0, end: 1 });
				assert.deepStrictEqual(viewModel.getSelections(), [{ start: 0, end: 1 }]);

				// arrow down, move both focus and selections
				cellList.setFocus([1], new KeyboardEvent('keydown'), undefined);
				cellList.setSelection([1], new KeyboardEvent('keydown'), undefined);
				assert.deepStrictEqual(viewModel.getFocus(), { start: 0, end: 1 });
				assert.deepStrictEqual(viewModel.getSelections(), [{ start: 0, end: 1 }]);

				// shift+arrow down, expands selection
				cellList.setFocus([2], new KeyboardEvent('keydown'), undefined);
				cellList.setSelection([1, 2]);
				assert.deepStrictEqual(viewModel.getFocus(), { start: 2, end: 3 });
				assert.deepStrictEqual(viewModel.getSelections(), [{ start: 1, end: 3 }]);

				// arrow down, will move focus but not expand selection
				cellList.setFocus([3], new KeyboardEvent('keydown'), undefined);
				assert.deepStrictEqual(viewModel.getFocus(), { start: 3, end: 4 });
				assert.deepStrictEqual(viewModel.getSelections(), [{ start: 1, end: 3 }]);
			});
	});


	test('notebook cell list focus/selection with folding regions', function () {
		withTestNotebook(
			instantiationService,
			[
				['# header a', 'markdown', CellKind.Markdown, [], {}],
				['var b = 1;', 'javascript', CellKind.Code, [], {}],
				['# header b', 'markdown', CellKind.Markdown, [], {}],
				['var b = 2;', 'javascript', CellKind.Code, [], {}],
				['# header c', 'markdown', CellKind.Markdown, [], {}]
			],
			(editor, viewModel) => {
				const foldingModel = new FoldingModel();
				foldingModel.attachViewModel(viewModel);

				const cellList = createNotebookCellList(instantiationService);
				cellList.attachViewModel(viewModel);
				assert.strictEqual(cellList.length, 5);
				assert.deepStrictEqual(viewModel.getFocus(), { start: 0, end: 1 });
				assert.deepStrictEqual(viewModel.getSelections(), [{ start: 0, end: 1 }]);
				cellList.setFocus([0]);

				updateFoldingStateAtIndex(foldingModel, 0, true);
				updateFoldingStateAtIndex(foldingModel, 2, true);
				viewModel.updateFoldingRanges(foldingModel.regions);
				cellList.setHiddenAreas(viewModel.getHiddenRanges(), true);
				assert.strictEqual(cellList.length, 3);

				// currently, focus on a folded cell will only focus the cell itself, excluding its "inner" cells
				assert.deepStrictEqual(viewModel.getFocus(), { start: 0, end: 1 });
				assert.deepStrictEqual(viewModel.getSelections(), [{ start: 0, end: 1 }]);

				cellList.focusNext(1, false);
				// focus next should skip the folded items
				assert.deepStrictEqual(viewModel.getFocus(), { start: 2, end: 3 });
				assert.deepStrictEqual(viewModel.getSelections(), [{ start: 0, end: 1 }]);

				// unfold
				updateFoldingStateAtIndex(foldingModel, 2, false);
				viewModel.updateFoldingRanges(foldingModel.regions);
				cellList.setHiddenAreas(viewModel.getHiddenRanges(), true);
				assert.strictEqual(cellList.length, 4);
				assert.deepStrictEqual(viewModel.getFocus(), { start: 2, end: 3 });
			});
	});

	test('notebook cell list view/model api', function () {
		withTestNotebook(
			instantiationService,
			[
				['# header a', 'markdown', CellKind.Markdown, [], {}],
				['var b = 1;', 'javascript', CellKind.Code, [], {}],
				['# header b', 'markdown', CellKind.Markdown, [], {}],
				['var b = 2;', 'javascript', CellKind.Code, [], {}],
				['# header c', 'markdown', CellKind.Markdown, [], {}]
			],
			(editor, viewModel) => {
				const foldingModel = new FoldingModel();
				foldingModel.attachViewModel(viewModel);

				const cellList = createNotebookCellList(instantiationService);
				cellList.attachViewModel(viewModel);

				updateFoldingStateAtIndex(foldingModel, 0, true);
				updateFoldingStateAtIndex(foldingModel, 2, true);

				assert.deepStrictEqual(cellList.getModelIndex2(-1), undefined);
				assert.deepStrictEqual(cellList.getModelIndex2(0), 0);
				assert.deepStrictEqual(cellList.getModelIndex2(1), 2);
				assert.deepStrictEqual(cellList.getModelIndex2(2), 4);
			});
	});


	test('notebook validate range', () => {
		withTestNotebook(
			instantiationService,
			[
				['# header a', 'markdown', CellKind.Markdown, [], {}],
				['var b = 1;', 'javascript', CellKind.Code, [], {}]
			],
			(editor, viewModel) => {
				assert.deepStrictEqual(viewModel.validateRange(null), null);
				assert.deepStrictEqual(viewModel.validateRange(undefined), null);
				assert.deepStrictEqual(viewModel.validateRange({ start: 0, end: 0 }), null);
				assert.deepStrictEqual(viewModel.validateRange({ start: 0, end: 2 }), { start: 0, end: 2 });
				assert.deepStrictEqual(viewModel.validateRange({ start: 0, end: 3 }), { start: 0, end: 2 });
				assert.deepStrictEqual(viewModel.validateRange({ start: -1, end: 3 }), { start: 0, end: 2 });
				assert.deepStrictEqual(viewModel.validateRange({ start: -1, end: 1 }), { start: 0, end: 1 });
				assert.deepStrictEqual(viewModel.validateRange({ start: 2, end: 1 }), { start: 1, end: 2 });
				assert.deepStrictEqual(viewModel.validateRange({ start: 2, end: -1 }), { start: 0, end: 2 });
			});
	});

	test('notebook updateSelectionState', function () {
		withTestNotebook(
			instantiationService,
			[
				['# header a', 'markdown', CellKind.Markdown, [], {}],
				['var b = 1;', 'javascript', CellKind.Code, [], {}]
			],
			(editor, viewModel) => {
				viewModel.updateSelectionsState({ kind: SelectionStateType.Index, focus: { start: 1, end: 2 }, selections: [{ start: 1, end: 2 }, { start: -1, end: 0 }] });
				assert.deepStrictEqual(viewModel.getSelections(), [{ start: 1, end: 2 }]);
			});
	});

	test('notebook cell selection w/ cell deletion', function () {
		withTestNotebook(
			instantiationService,
			[
				['# header a', 'markdown', CellKind.Markdown, [], {}],
				['var b = 1;', 'javascript', CellKind.Code, [], {}]
			],
			(editor, viewModel) => {
				viewModel.updateSelectionsState({ kind: SelectionStateType.Index, focus: { start: 1, end: 2 }, selections: [{ start: 1, end: 2 }] });
				viewModel.deleteCell(1, true, false);
				assert.deepStrictEqual(viewModel.getFocus(), { start: 0, end: 1 });
				assert.deepStrictEqual(viewModel.getSelections(), []);
			});
	});
});
