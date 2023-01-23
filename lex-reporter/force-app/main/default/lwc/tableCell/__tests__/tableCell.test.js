import { createElement } from 'lwc';
import TableCell from 'c/tableCell';
const Class = require('../../cell/Cell');

describe('a cell', () => {
    const editableTextCell = createElement('c-table-cell', {
        is: TableCell
    });

    // given editable text cell
    const editableCell = new Class.Cell();
    editableCell.DataId = 'DataId';
    editableCell.Label = 'Label';
    editableCell.Value = 'Value';
    editableCell.Type = 'String';
    editableCell.IsEditable = true;
    editableCell.IsReference = false;
    editableCell.Url = '';
    editableCell.IsDatetime = false;
    editableTextCell.cell = editableCell;

    // given uneditable text cell
    const uneditableTextCell = createElement('c-table-cell', {
        is: TableCell
    });
    const uneditableCell = new Class.Cell();
    uneditableCell.DataId = 'DataId';
    uneditableCell.Label = 'Label';
    uneditableCell.Value = 'Value';
    uneditableCell.Type = 'String';
    uneditableCell.IsEditable = false;
    uneditableCell.IsReference = false;
    uneditableCell.Url = '';
    uneditableCell.IsDatetime = false;
    uneditableTextCell.cell = uneditableCell;

    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('is editable text', () => {
        // when page renders
        document.body.appendChild(editableTextCell);

        // then editable cell is rendered
        const div = editableTextCell.shadowRoot.querySelector('div[data-id="DataId"]');
        expect(div).toBeTruthy();
        expect(div.classList.contains('read-only-padding')).toBe(true);

        // and editable cell contains input
        const input = editableTextCell.shadowRoot.querySelector('div[data-id="DataId"] lightning-input');
        expect(input).not.toBeUndefined();
        expect(input.value).toBe('Value');
        expect(input.dataset.id).toBe('DataId');

        // and when editable cell is clicked
        const handler = jest.fn();
        editableTextCell.addEventListener('cellclick', handler);
        div.click();

        // then cellclick event is fired
        //     and cell is not read-only
        return Promise.resolve().then(() => {
            expect(div.classList.contains('read-only-padding')).toBe(false);
            expect(handler).toHaveBeenCalled();
        });
    });

    it('is uneditable text', () => {
        // when page renders
        document.body.appendChild(uneditableTextCell);

        // then uneditable cell is rendered
        expect(
            uneditableTextCell.shadowRoot.querySelector('div[data-id="DataId"]')
        ).toBeFalsy();

        // and uneditable cell contains input
        const input = uneditableTextCell.shadowRoot.querySelector('lightning-input');
        expect(input).not.toBeUndefined();
        // check input for readonly
        expect(input.readOnly).toBeTruthy();
        expect(input.value).toBe('Value');
        expect(input.dataset.id).toBe('DataId');

        // and when uneditable cell is clicked
        input.click();
        const handler = jest.fn();
        uneditableTextCell.addEventListener('cellclick', handler);
        input.click();
        
        // cell is still read-only
        return Promise.resolve().then(() => {
            expect(handler).not.toHaveBeenCalled();
        });
    });

    it('is reference', () => {
        // given reference cell
        const referenceCell = createElement('c-table-cell', {
            is: TableCell
        });
        const cellData = new Class.Cell();
        cellData.DataId = 'DataId';
        cellData.Label = 'Label';
        cellData.Value = 'Value';
        cellData.Type = 'String';
        cellData.IsEditable = true;
        cellData.IsReference = true;
        cellData.Url = 'http://www.example.com/';
        cellData.IsDatetime = false;
        referenceCell.cell = cellData;

        // when page renders
        document.body.appendChild(referenceCell);

        // then reference cell is rendered
        const div = referenceCell.shadowRoot.querySelector('div');
        expect(div).toBeFalsy();

        // and reference cell contains input
        const anchorTag = referenceCell.shadowRoot.querySelector('a');
        expect(anchorTag).not.toBeUndefined();
        expect(anchorTag.textContent).toBe(cellData.Label);
        expect(anchorTag.href).toBe(cellData.Url);
    });
});